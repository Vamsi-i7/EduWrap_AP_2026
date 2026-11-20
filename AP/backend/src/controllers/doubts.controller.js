const db = require('../config/db');
const { getCollection } = require('../config/mongo');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../utils/errors');
const { success } = require('../utils/response');

// Helper to check room membership
async function checkRoomMembership(roomId, userId) {
  const querySql = `
    SELECT rm.joined_at, (r.owner_id = $2) AS is_room_owner
    FROM room_members rm
    JOIN rooms r ON r.room_id = rm.room_id
    WHERE rm.room_id = $1 AND rm.user_id = $2;
  `;
  const result = await db.query(querySql, [roomId, userId]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

// @W19 -- POST DOUBT
async function createDoubt(req, res, next) {
  const client = await db.getClient();
  try {
    const userId = req.user.userId;
    const { room_id, title, body = null } = req.body;

    const parsedRoomId = parseInt(room_id, 10);
    if (isNaN(parsedRoomId)) throw new BadRequestError('Valid room_id is required');

    if (!title || typeof title !== 'string' || title.trim().length < 10 || title.trim().length > 150) {
      throw new BadRequestError('Title must be between 10 and 150 characters');
    }
    if (body && (typeof body !== 'string' || body.length > 2000)) {
      throw new BadRequestError('Body must be 2000 characters or less');
    }

    // Verify user is a member of the room
    const membership = await checkRoomMembership(parsedRoomId, userId);
    if (!membership) {
      throw new ForbiddenError('You must be a member of the room to ask a doubt');
    }

    await client.query('BEGIN');

    // Insert doubt (@W19)
    const insertSql = `
      INSERT INTO doubts (room_id, author_id, title, body)
      VALUES ($1, $2, $3, $4)
      RETURNING doubt_id, room_id, author_id, title, body, created_at;
    `;
    const doubtRes = await client.query(insertSql, [parsedRoomId, userId, title.trim(), body ? body.trim() : null]);
    const doubt = doubtRes.rows[0];

    // Award +5 points for asking doubt
    await client.query(
      `INSERT INTO points_events (user_id, event_type, points, doubt_id)
       VALUES ($1, 'ask_doubt', 5, $2);`,
      [userId, doubt.doubt_id]
    );

    await client.query('COMMIT');

    // Notify room in background via MongoDB activity feed
    setImmediate(async () => {
      try {
        const activityCol = getCollection('activity_events');
        await activityCol.insertOne({
          type: 'new_doubt',
          actor_id: userId,
          room_id: parsedRoomId,
          doubt_id: doubt.doubt_id,
          text_summary: `Asked a new doubt: "${doubt.title}"`,
          created_at: new Date(),
        });
      } catch (err) {
        console.warn('[MongoDB] Activity log failed:', err.message);
      }
    });

    return success(res, { doubt }, 201, 'Doubt posted successfully (+5 points)');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// @R17 -- LIST DOUBTS (FILTERED BY ROOM OR USER ROOMS)
async function listDoubts(req, res, next) {
  try {
    const userId = req.user.userId;
    const { room_id, status, q, page = 1, limit = 20 } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    // Conditions: user must belong to the room
    let conditions = [
      `rm.user_id = $1`
    ];
    const params = [userId];
    let pIdx = 2;

    if (room_id) {
      conditions.push(`d.room_id = $${pIdx++}`);
      params.push(parseInt(room_id, 10));
    }
    if (q && q.trim()) {
      conditions.push(`(d.title ILIKE $${pIdx} OR d.body ILIKE $${pIdx})`);
      params.push(`%${q.trim()}%`);
      pIdx++;
    }

    let havingClause = '';
    if (status === 'resolved') {
      havingClause = 'HAVING BOOL_OR(a.is_accepted) = true';
    } else if (status === 'unresolved') {
      havingClause = 'HAVING BOOL_OR(a.is_accepted) IS NOT TRUE';
    }

    const whereClause = conditions.join(' AND ');

    const listSql = `
      SELECT d.doubt_id,
             d.room_id,
             r.name       AS room_name,
             d.author_id,
             u.name       AS author_name,
             d.title,
             d.body,
             d.created_at,
             COUNT(DISTINCT a.answer_id)::integer AS answer_count,
             COALESCE(BOOL_OR(a.is_accepted), false) AS is_resolved,
             (d.author_id = $1) AS is_author
      FROM doubts d
      JOIN rooms r         ON r.room_id = d.room_id
      JOIN room_members rm ON rm.room_id = d.room_id
      JOIN users u         ON u.user_id = d.author_id
      LEFT JOIN answers a  ON a.doubt_id = d.doubt_id
      WHERE ${whereClause}
      GROUP BY d.doubt_id, d.room_id, r.name, d.author_id, u.name, d.title, d.body, d.created_at
      ${havingClause}
      ORDER BY d.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++};
    `;
    params.push(parsedLimit, offset);

    const result = await db.query(listSql, params);
    return success(res, { doubts: result.rows, page: parsedPage, limit: parsedLimit });
  } catch (err) {
    next(err);
  }
}

// @R18 -- GET DOUBT DETAIL WITH ALL ANSWERS AND UPVOTE STATUS
async function getDoubt(req, res, next) {
  try {
    const doubtId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    if (isNaN(doubtId)) throw new BadRequestError('Invalid doubt ID');

    // Fetch doubt
    const doubtSql = `
      SELECT d.doubt_id,
             d.room_id,
             r.name       AS room_name,
             r.owner_id   AS room_owner_id,
             d.author_id,
             u.name       AS author_name,
             d.title,
             d.body,
             d.created_at,
             (d.author_id = $2) AS is_author,
             (r.owner_id = $2)  AS is_room_owner
      FROM doubts d
      JOIN rooms r ON r.room_id = d.room_id
      JOIN users u ON u.user_id = d.author_id
      WHERE d.doubt_id = $1;
    `;
    const doubtRes = await db.query(doubtSql, [doubtId, userId]);
    if (doubtRes.rows.length === 0) throw new NotFoundError('Doubt not found');

    const doubt = doubtRes.rows[0];

    // Check membership in the doubt's room
    const memCheck = await checkRoomMembership(doubt.room_id, userId);
    if (!memCheck) {
      throw new ForbiddenError('You must be a member of this room to view this doubt');
    }

    // Fetch answers (@R18)
    const answersSql = `
      SELECT a.answer_id,
             a.doubt_id,
             a.author_id,
             u.name       AS author_name,
             a.body,
             a.is_accepted,
             a.created_at,
             COUNT(au.user_id)::integer AS upvote_count,
             BOOL_OR(au.user_id = $2)   AS has_upvoted,
             (a.author_id = $2)         AS is_author
      FROM answers a
      JOIN users u               ON u.user_id = a.author_id
      LEFT JOIN answer_upvotes au ON au.answer_id = a.answer_id
      WHERE a.doubt_id = $1
      GROUP BY a.answer_id, a.doubt_id, a.author_id, u.name, a.body, a.is_accepted, a.created_at
      ORDER BY a.is_accepted DESC, upvote_count DESC, a.created_at ASC;
    `;
    const answersRes = await db.query(answersSql, [doubtId, userId]);

    return success(res, {
      doubt,
      answers: answersRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

// @W20 -- EDIT DOUBT (AUTHOR ONLY)
async function updateDoubt(req, res, next) {
  try {
    const doubtId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    const { title, body } = req.body;

    const dRes = await db.query('SELECT author_id FROM doubts WHERE doubt_id = $1', [doubtId]);
    if (dRes.rows.length === 0) throw new NotFoundError('Doubt not found');
    if (dRes.rows[0].author_id !== userId) {
      throw new ForbiddenError('Only the author can edit this doubt');
    }

    const updates = [];
    const params = [];
    let pIdx = 1;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 10 || title.trim().length > 150) {
        throw new BadRequestError('Title must be between 10 and 150 characters');
      }
      updates.push(`title = $${pIdx++}`);
      params.push(title.trim());
    }
    if (body !== undefined) {
      if (body !== null && (typeof body !== 'string' || body.length > 2000)) {
        throw new BadRequestError('Body must be 2000 characters or less');
      }
      updates.push(`body = $${pIdx++}`);
      params.push(body ? body.trim() : null);
    }

    if (updates.length === 0) throw new BadRequestError('No fields provided to update');

    params.push(doubtId);
    const updateSql = `
      UPDATE doubts
      SET ${updates.join(', ')}
      WHERE doubt_id = $${pIdx}
      RETURNING doubt_id, title, body, created_at;
    `;
    const result = await db.query(updateSql, params);
    return success(res, { doubt: result.rows[0] }, 200, 'Doubt updated successfully');
  } catch (err) {
    next(err);
  }
}

// @W21 -- DELETE DOUBT (AUTHOR OR ROOM OWNER)
async function deleteDoubt(req, res, next) {
  try {
    const doubtId = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    const checkSql = `
      SELECT d.author_id, r.owner_id AS room_owner_id
      FROM doubts d
      JOIN rooms r ON r.room_id = d.room_id
      WHERE d.doubt_id = $1;
    `;
    const dRes = await db.query(checkSql, [doubtId]);
    if (dRes.rows.length === 0) throw new NotFoundError('Doubt not found');

    const { author_id, room_owner_id } = dRes.rows[0];
    if (author_id !== userId && room_owner_id !== userId) {
      throw new ForbiddenError('Only the doubt author or room owner can delete this doubt');
    }

    // Cascades answers, answer_upvotes, points_events automatically (@W21)
    await db.query('DELETE FROM doubts WHERE doubt_id = $1', [doubtId]);
    return success(res, { deleted_doubt_id: doubtId }, 200, 'Doubt deleted successfully');
  } catch (err) {
    next(err);
  }
}

// @W22 -- POST ANSWER
async function createAnswer(req, res, next) {
  const client = await db.getClient();
  try {
    const doubtId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    const { body } = req.body;

    if (isNaN(doubtId)) throw new BadRequestError('Invalid doubt ID');
    if (!body || typeof body !== 'string' || body.trim().length === 0 || body.length > 2000) {
      throw new BadRequestError('Answer body is required and must be 2000 characters or less');
    }

    // Fetch doubt and room
    const dRes = await client.query('SELECT room_id, author_id, title FROM doubts WHERE doubt_id = $1', [doubtId]);
    if (dRes.rows.length === 0) throw new NotFoundError('Doubt not found');
    const doubt = dRes.rows[0];

    // Check membership
    const membership = await checkRoomMembership(doubt.room_id, userId);
    if (!membership) {
      throw new ForbiddenError('You must be a member of the room to answer doubts');
    }

    await client.query('BEGIN');

    // Insert answer (@W22)
    const insertSql = `
      INSERT INTO answers (doubt_id, author_id, body)
      VALUES ($1, $2, $3)
      RETURNING answer_id, doubt_id, author_id, body, is_accepted, created_at;
    `;
    const ansRes = await client.query(insertSql, [doubtId, userId, body.trim()]);
    const answer = ansRes.rows[0];

    // Award +10 points to answer author (@W23)
    await client.query(
      `INSERT INTO points_events (user_id, event_type, points, answer_id)
       VALUES ($1, 'post_answer', 10, $2);`,
      [userId, answer.answer_id]
    );

    // Update daily activity (answers_posted + 1)
    await client.query(
      `INSERT INTO daily_activity (user_id, activity_date, answers_posted)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (user_id, activity_date)
       DO UPDATE SET answers_posted = daily_activity.answers_posted + 1;`,
      [userId]
    );

    await client.query('COMMIT');

    // Notify doubt author in MongoDB
    if (doubt.author_id !== userId) {
      setImmediate(async () => {
        try {
          const notifCol = getCollection('notifications');
          await notifCol.insertOne({
            recipient_id: doubt.author_id,
            type: 'new_answer',
            message: `Someone answered your doubt: "${doubt.title}"`,
            link: `/doubts/${doubtId}`,
            is_read: false,
            created_at: new Date(),
          });
        } catch (err) {
          console.warn('[MongoDB] Notification insert failed:', err.message);
        }
      });
    }

    return success(res, { answer }, 201, 'Answer posted successfully (+10 points)');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// @W24 -- TOGGLE UPVOTE ON ANSWER
async function toggleUpvote(req, res, next) {
  const client = await db.getClient();
  try {
    const answerId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    if (isNaN(answerId)) throw new BadRequestError('Invalid answer ID');

    // Fetch answer details
    const aRes = await client.query('SELECT author_id FROM answers WHERE answer_id = $1', [answerId]);
    if (aRes.rows.length === 0) throw new NotFoundError('Answer not found');
    const answerAuthorId = aRes.rows[0].author_id;

    if (answerAuthorId === userId) {
      throw new BadRequestError('You cannot upvote your own answer');
    }

    await client.query('BEGIN');

    // Check if currently upvoted
    const upRes = await client.query(
      'SELECT 1 FROM answer_upvotes WHERE answer_id = $1 AND user_id = $2',
      [answerId, userId]
    );

    let upvoted = false;
    if (upRes.rows.length > 0) {
      // Remove upvote - cascades points_event automatically via fk_pe_upvote constraint!
      await client.query('DELETE FROM answer_upvotes WHERE answer_id = $1 AND user_id = $2', [answerId, userId]);
      upvoted = false;
    } else {
      // Add upvote
      await client.query('INSERT INTO answer_upvotes (answer_id, user_id) VALUES ($1, $2)', [answerId, userId]);
      // Award +2 points to answer author linked to this upvote
      await client.query(
        `INSERT INTO points_events (user_id, event_type, points, answer_id, voter_id)
         VALUES ($1, 'answer_upvoted', 2, $2, $3);`,
        [answerAuthorId, answerId, userId]
      );
      upvoted = true;
    }

    // Get fresh total upvotes
    const totalRes = await client.query('SELECT COUNT(user_id)::integer AS total FROM answer_upvotes WHERE answer_id = $1', [answerId]);
    await client.query('COMMIT');

    return success(res, {
      answer_id: answerId,
      upvoted,
      upvote_count: totalRes.rows[0].total,
    }, 200, upvoted ? 'Upvoted answer (+2 points to author)' : 'Upvote removed');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// @W25 -- ACCEPT / UN-ACCEPT ANSWER (DOUBT AUTHOR ONLY)
async function toggleAcceptAnswer(req, res, next) {
  const client = await db.getClient();
  try {
    const answerId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    if (isNaN(answerId)) throw new BadRequestError('Invalid answer ID');

    // Fetch answer, doubt, and doubt author
    const querySql = `
      SELECT a.answer_id,
             a.doubt_id,
             a.author_id AS answer_author_id,
             a.is_accepted,
             d.author_id AS doubt_author_id
      FROM answers a
      JOIN doubts d ON d.doubt_id = a.doubt_id
      WHERE a.answer_id = $1;
    `;
    const result = await client.query(querySql, [answerId]);
    if (result.rows.length === 0) throw new NotFoundError('Answer not found');

    const item = result.rows[0];
    if (item.doubt_author_id !== userId) {
      throw new ForbiddenError('Only the author of the doubt can accept or un-accept an answer');
    }

    await client.query('BEGIN');

    let newStatus = false;
    if (item.is_accepted) {
      // UN-ACCEPT
      await client.query('UPDATE answers SET is_accepted = false WHERE answer_id = $1', [answerId]);
      // Remove accepted answer points
      await client.query(
        `DELETE FROM points_events
         WHERE event_type = 'answer_accepted' AND answer_id = $1;`,
        [answerId]
      );
      newStatus = false;
    } else {
      // ACCEPT: First un-accept any previously accepted answer on this doubt
      const prevAccepted = await client.query(
        'SELECT answer_id FROM answers WHERE doubt_id = $1 AND is_accepted = true',
        [item.doubt_id]
      );
      if (prevAccepted.rows.length > 0) {
        const prevId = prevAccepted.rows[0].answer_id;
        await client.query('UPDATE answers SET is_accepted = false WHERE answer_id = $1', [prevId]);
        await client.query(
          `DELETE FROM points_events WHERE event_type = 'answer_accepted' AND answer_id = $1`,
          [prevId]
        );
      }

      // Mark this answer as accepted
      await client.query('UPDATE answers SET is_accepted = true WHERE answer_id = $1', [answerId]);
      // Award +15 points to answer author
      await client.query(
        `INSERT INTO points_events (user_id, event_type, points, answer_id)
         VALUES ($1, 'answer_accepted', 15, $2);`,
        [item.answer_author_id, answerId]
      );
      newStatus = true;
    }

    await client.query('COMMIT');

    return success(res, {
      answer_id: answerId,
      is_accepted: newStatus,
    }, 200, newStatus ? 'Answer accepted as verified solution (+15 points to author)' : 'Answer acceptance removed');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// SAVE ANSWER AS FLASHCARD
async function saveAsCard(req, res, next) {
  try {
    const answerId = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    const { deck_id, front } = req.body;

    if (isNaN(answerId)) throw new BadRequestError('Invalid answer ID');
    const parsedDeckId = parseInt(deck_id, 10);
    if (isNaN(parsedDeckId)) throw new BadRequestError('Valid deck_id is required');

    // Verify deck ownership
    const deckRes = await db.query('SELECT owner_id FROM decks WHERE deck_id = $1', [parsedDeckId]);
    if (deckRes.rows.length === 0) throw new NotFoundError('Deck not found');
    if (deckRes.rows[0].owner_id !== userId) {
      throw new ForbiddenError('You can only save cards into your own decks');
    }

    // Verify answer
    const ansRes = await db.query(
      `SELECT a.body, d.title AS doubt_title
       FROM answers a
       JOIN doubts d ON d.doubt_id = a.doubt_id
       WHERE a.answer_id = $1;`,
      [answerId]
    );
    if (ansRes.rows.length === 0) throw new NotFoundError('Answer not found');

    const cardFront = (front && front.trim()) || ansRes.rows[0].doubt_title;
    const cardBack = ansRes.rows[0].body;

    const insertSql = `
      INSERT INTO cards (deck_id, front, back, source_answer_id)
      VALUES ($1, $2, $3, $4)
      RETURNING card_id, deck_id, front, back, source_answer_id, created_at;
    `;
    const cardRes = await db.query(insertSql, [parsedDeckId, cardFront, cardBack, answerId]);

    return success(res, { card: cardRes.rows[0] }, 201, 'Answer saved as flashcard');
  } catch (err) {
    next(err);
  }
}

// DELETE ANSWER
async function deleteAnswer(req, res, next) {
  try {
    const answerId = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    const checkSql = `
      SELECT a.author_id, r.owner_id AS room_owner_id
      FROM answers a
      JOIN doubts d ON d.doubt_id = a.doubt_id
      JOIN rooms r  ON r.room_id = d.room_id
      WHERE a.answer_id = $1;
    `;
    const aRes = await db.query(checkSql, [answerId]);
    if (aRes.rows.length === 0) throw new NotFoundError('Answer not found');

    const { author_id, room_owner_id } = aRes.rows[0];
    if (author_id !== userId && room_owner_id !== userId) {
      throw new ForbiddenError('Only the answer author or room owner can delete this answer');
    }

    await db.query('DELETE FROM answers WHERE answer_id = $1', [answerId]);
    return success(res, { deleted_answer_id: answerId }, 200, 'Answer deleted successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDoubt,
  listDoubts,
  getDoubt,
  updateDoubt,
  deleteDoubt,
  createAnswer,
  toggleUpvote,
  toggleAcceptAnswer,
  saveAsCard,
  deleteAnswer,
};
