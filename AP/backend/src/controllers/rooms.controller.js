const crypto = require('crypto');
const db = require('../config/db');
const { BadRequestError, ForbiddenError, NotFoundError, ConflictError } = require('../utils/errors');
const { success } = require('../utils/response');

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars hex
}

// @R04 -- GET SUBJECTS LIST
async function getSubjects(req, res, next) {
  try {
    const querySql = `
      SELECT s.subject_id,
             s.name AS subject_name,
             COUNT(DISTINCT r.room_id)::integer AS total_rooms,
             COUNT(DISTINCT d.deck_id)::integer AS total_decks
      FROM subjects s
      LEFT JOIN rooms r ON r.subject_id = s.subject_id
      LEFT JOIN decks d ON d.subject_id = s.subject_id
      GROUP BY s.subject_id, s.name
      ORDER BY s.name ASC;
    `;
    const result = await db.query(querySql);
    return success(res, { subjects: result.rows });
  } catch (err) {
    next(err);
  }
}

// @W05 & @W06 -- CREATE ROOM
async function createRoom(req, res, next) {
  const client = await db.getClient();
  try {
    const userId = req.user.userId;
    const { name, description = null, subject_id, visibility = 'public' } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 50) {
      throw new BadRequestError('Room name must be between 3 and 50 characters');
    }
    if (description && (typeof description !== 'string' || description.length > 200)) {
      throw new BadRequestError('Description must be 200 characters or less');
    }
    const parsedSubjectId = parseInt(subject_id, 10);
    if (isNaN(parsedSubjectId)) {
      throw new BadRequestError('Valid subject_id is required');
    }
    if (!['public', 'private'].includes(visibility)) {
      throw new BadRequestError('Visibility must be either "public" or "private"');
    }

    // Verify subject exists
    const subCheck = await client.query('SELECT subject_id FROM subjects WHERE subject_id = $1', [parsedSubjectId]);
    if (subCheck.rows.length === 0) {
      throw new BadRequestError('Subject does not exist');
    }

    let inviteCode = generateInviteCode();
    // Unique invite code check
    let codeAttempts = 0;
    while (codeAttempts < 5) {
      const codeCheck = await client.query('SELECT room_id FROM rooms WHERE invite_code = $1', [inviteCode]);
      if (codeCheck.rows.length === 0) break;
      inviteCode = generateInviteCode();
      codeAttempts++;
    }

    await client.query('BEGIN');

    // Insert room (@W05)
    const insertRoomSql = `
      INSERT INTO rooms (name, description, subject_id, visibility, invite_code, owner_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING room_id, name, description, subject_id, visibility, invite_code, owner_id, created_at;
    `;
    const roomRes = await client.query(insertRoomSql, [
      name.trim(),
      description ? description.trim() : null,
      parsedSubjectId,
      visibility,
      inviteCode,
      userId,
    ]);
    const room = roomRes.rows[0];

    // Creator automatically joins as member (@W06)
    await client.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)',
      [room.room_id, userId]
    );

    await client.query('COMMIT');

    return success(res, { room }, 201, 'Room created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// @R05 -- LIST & DISCOVER ROOMS
async function listRooms(req, res, next) {
  try {
    const userId = req.user ? req.user.userId : null;
    const { filter = 'discover', subject_id, q } = req.query;

    let querySql = '';
    const params = [];
    let pIdx = 1;

    if (filter === 'my') {
      if (!userId) {
        throw new ForbiddenError('Authentication required to view your rooms');
      }
      querySql = `
        SELECT r.room_id,
               r.name        AS room_name,
               r.description AS room_description,
               r.visibility,
               r.invite_code,
               r.created_at,
               s.subject_id,
               s.name        AS subject_name,
               u.user_id     AS owner_id,
               u.name        AS owner_name,
               COUNT(rm_all.user_id)::integer AS member_count,
               (r.owner_id = $1) AS is_owner
        FROM rooms r
        JOIN room_members rm ON rm.room_id = r.room_id AND rm.user_id = $1
        JOIN subjects s      ON s.subject_id = r.subject_id
        JOIN users u         ON u.user_id = r.owner_id
        LEFT JOIN room_members rm_all ON rm_all.room_id = r.room_id
        GROUP BY r.room_id, r.name, r.description, r.visibility, r.invite_code, r.created_at, s.subject_id, s.name, u.user_id, u.name
        ORDER BY r.created_at DESC;
      `;
      params.push(userId);
    } else {
      // discover public rooms
      let conditions = [`r.visibility = 'public'`];

      if (subject_id) {
        conditions.push(`r.subject_id = $${pIdx++}`);
        params.push(parseInt(subject_id, 10));
      }
      if (q && q.trim()) {
        conditions.push(`r.name ILIKE $${pIdx++}`);
        params.push(`%${q.trim()}%`);
      }

      querySql = `
        SELECT r.room_id,
               r.name        AS room_name,
               r.description AS room_description,
               r.visibility,
               r.invite_code,
               r.created_at,
               s.subject_id,
               s.name        AS subject_name,
               u.user_id     AS owner_id,
               u.name        AS owner_name,
               COUNT(rm.user_id)::integer AS member_count,
               ${userId ? `BOOL_OR(rm.user_id = ${userId})` : 'false'} AS is_member
        FROM rooms r
        JOIN subjects s     ON s.subject_id = r.subject_id
        JOIN users u        ON u.user_id = r.owner_id
        LEFT JOIN room_members rm ON rm.room_id = r.room_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY r.room_id, r.name, r.description, r.visibility, r.invite_code, r.created_at, s.subject_id, s.name, u.user_id, u.name
        ORDER BY member_count DESC, r.created_at DESC;
      `;
    }

    const result = await db.query(querySql, params);
    return success(res, { rooms: result.rows });
  } catch (err) {
    next(err);
  }
}

// @R06 -- GET ROOM DETAILS
async function getRoom(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    if (isNaN(roomId)) {
      throw new BadRequestError('Invalid room ID');
    }

    // Check membership
    const memberCheck = await db.query(
      'SELECT joined_at FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    const isMember = memberCheck.rows.length > 0;

    const selectSql = `
      SELECT r.room_id,
             r.name        AS room_name,
             r.description AS room_description,
             r.visibility,
             r.invite_code,
             r.created_at,
             s.subject_id,
             s.name        AS subject_name,
             u.user_id     AS owner_id,
             u.name        AS owner_name,
             COUNT(DISTINCT rm.user_id)::integer AS member_count,
             COUNT(DISTINCT d.doubt_id)::integer AS doubt_count,
             COUNT(DISTINCT dk.deck_id)::integer AS shared_deck_count
      FROM rooms r
      JOIN subjects s            ON s.subject_id = r.subject_id
      JOIN users u               ON u.user_id = r.owner_id
      LEFT JOIN room_members rm  ON rm.room_id = r.room_id
      LEFT JOIN doubts d         ON d.room_id = r.room_id
      LEFT JOIN decks dk         ON dk.room_id = r.room_id
      WHERE r.room_id = $1
      GROUP BY r.room_id, r.name, r.description, r.visibility, r.invite_code, r.created_at, s.subject_id, s.name, u.user_id, u.name;
    `;
    const result = await db.query(selectSql, [roomId]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Room not found');
    }

    const room = result.rows[0];

    // Privacy rule: private room contents accessible only to members
    if (room.visibility === 'private' && !isMember) {
      throw new ForbiddenError('This room is private. You must join via invite code to view its contents.');
    }

    return success(res, {
      room: {
        ...room,
        is_member: isMember,
        is_owner: room.owner_id === userId,
      },
    });
  } catch (err) {
    next(err);
  }
}

// @W06 -- JOIN PUBLIC ROOM
async function joinRoom(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    if (isNaN(roomId)) throw new BadRequestError('Invalid room ID');

    const roomRes = await db.query('SELECT room_id, visibility FROM rooms WHERE room_id = $1', [roomId]);
    if (roomRes.rows.length === 0) throw new NotFoundError('Room not found');

    const room = roomRes.rows[0];
    if (room.visibility === 'private') {
      throw new ForbiddenError('Private rooms require an invite code to join');
    }

    // Insert into room_members (@W06)
    await db.query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING;`,
      [roomId, userId]
    );

    return success(res, { room_id: roomId }, 200, 'Successfully joined room');
  } catch (err) {
    next(err);
  }
}

// @R09 & @W06 -- JOIN ROOM BY INVITE CODE
async function joinByCode(req, res, next) {
  try {
    const { invite_code } = req.body;
    const userId = req.user.userId;

    if (!invite_code || typeof invite_code !== 'string' || invite_code.trim().length !== 8) {
      throw new BadRequestError('An 8-character invite code is required');
    }

    const cleanCode = invite_code.trim().toUpperCase();

    // Look up room by invite code (@R09)
    const selectSql = `
      SELECT r.room_id,
             r.name,
             r.visibility,
             r.owner_id
      FROM rooms r
      WHERE r.invite_code = $1;
    `;
    const result = await db.query(selectSql, [cleanCode]);
    if (result.rows.length === 0) {
      throw new NotFoundError('No room matches this invite code');
    }

    const room = result.rows[0];

    // Join room (@W06)
    await db.query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING;`,
      [room.room_id, userId]
    );

    return success(res, { room }, 200, `Successfully joined room '${room.name}'`);
  } catch (err) {
    next(err);
  }
}

// @W07 -- LEAVE ROOM
async function leaveRoom(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    if (isNaN(roomId)) throw new BadRequestError('Invalid room ID');

    const roomRes = await db.query('SELECT owner_id FROM rooms WHERE room_id = $1', [roomId]);
    if (roomRes.rows.length === 0) throw new NotFoundError('Room not found');

    if (roomRes.rows[0].owner_id === userId) {
      throw new ForbiddenError('Room owner cannot leave the room. You must delete the room instead.');
    }

    await db.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
    return success(res, null, 200, 'Successfully left room');
  } catch (err) {
    next(err);
  }
}

// @R07 -- LIST ROOM MEMBERS
async function getMembers(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    if (isNaN(roomId)) throw new BadRequestError('Invalid room ID');

    // Check membership
    const memberCheck = await db.query(
      'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    if (memberCheck.rows.length === 0) {
      throw new ForbiddenError('Only room members can view the member list');
    }

    const membersSql = `
      SELECT u.user_id,
             u.name,
             rm.joined_at,
             (u.user_id = r.owner_id) AS is_owner
      FROM room_members rm
      JOIN users u ON u.user_id = rm.user_id
      JOIN rooms r ON r.room_id = rm.room_id
      WHERE rm.room_id = $1
      ORDER BY is_owner DESC, rm.joined_at ASC;
    `;
    const result = await db.query(membersSql, [roomId]);
    return success(res, { members: result.rows });
  } catch (err) {
    next(err);
  }
}

// @W07 -- REMOVE MEMBER (OWNER ONLY)
async function removeMember(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    const currentUserId = req.user.userId;

    if (isNaN(roomId) || isNaN(targetUserId)) {
      throw new BadRequestError('Invalid room ID or user ID');
    }

    const roomRes = await db.query('SELECT owner_id FROM rooms WHERE room_id = $1', [roomId]);
    if (roomRes.rows.length === 0) throw new NotFoundError('Room not found');

    if (roomRes.rows[0].owner_id !== currentUserId) {
      throw new ForbiddenError('Only the room owner can remove members');
    }
    if (targetUserId === currentUserId) {
      throw new BadRequestError('Owner cannot be removed from the room');
    }

    await db.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [roomId, targetUserId]);
    return success(res, null, 200, 'Member removed successfully');
  } catch (err) {
    next(err);
  }
}

// @W08 -- UPDATE ROOM DETAILS (OWNER ONLY)
async function updateRoom(req, res, next) {
  try {
    const roomId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    const { name, description, visibility } = req.body;

    const roomRes = await db.query('SELECT owner_id FROM rooms WHERE room_id = $1', [roomId]);
    if (roomRes.rows.length === 0) throw new NotFoundError('Room not found');
    if (roomRes.rows[0].owner_id !== userId) {
      throw new ForbiddenError('Only the room owner can edit room details');
    }

    const updates = [];
    const params = [];
    let pIdx = 1;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 50) {
        throw new BadRequestError('Room name must be between 3 and 50 characters');
      }
      updates.push(`name = $${pIdx++}`);
      params.push(name.trim());
    }

    if (description !== undefined) {
      if (description !== null && (typeof description !== 'string' || description.length > 200)) {
        throw new BadRequestError('Description must be 200 characters or less');
      }
      updates.push(`description = $${pIdx++}`);
      params.push(description ? description.trim() : null);
    }

    if (visibility !== undefined) {
      if (!['public', 'private'].includes(visibility)) {
        throw new BadRequestError('Visibility must be public or private');
      }
      updates.push(`visibility = $${pIdx++}`);
      params.push(visibility);
    }

    if (updates.length === 0) {
      throw new BadRequestError('No valid fields provided to update');
    }

    params.push(roomId);
    const updateSql = `
      UPDATE rooms
      SET ${updates.join(', ')}
      WHERE room_id = $${pIdx}
      RETURNING room_id, name, description, visibility, invite_code, created_at;
    `;
    const result = await db.query(updateSql, params);
    return success(res, { room: result.rows[0] }, 200, 'Room updated successfully');
  } catch (err) {
    next(err);
  }
}

// @W09 -- DELETE ROOM ATOMIC TRANSACTION (OWNER ONLY)
async function deleteRoom(req, res, next) {
  const client = await db.getClient();
  try {
    const roomId = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    const roomRes = await client.query('SELECT owner_id FROM rooms WHERE room_id = $1', [roomId]);
    if (roomRes.rows.length === 0) throw new NotFoundError('Room not found');
    if (roomRes.rows[0].owner_id !== userId) {
      throw new ForbiddenError('Only the room owner can delete the room');
    }

    await client.query('BEGIN');

    // Room-associated decks have room_id set to NULL (@W09 cascade via foreign key)
    // Doubts, answers, points_events cascade delete automatically via foreign keys
    await client.query('DELETE FROM rooms WHERE room_id = $1', [roomId]);

    await client.query('COMMIT');
    return success(res, { deleted_room_id: roomId }, 200, 'Room and all contents deleted successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getSubjects,
  createRoom,
  listRooms,
  getRoom,
  joinRoom,
  joinByCode,
  leaveRoom,
  getMembers,
  removeMember,
  updateRoom,
  deleteRoom,
};
