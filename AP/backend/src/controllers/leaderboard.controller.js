const db = require('../config/db');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../utils/errors');
const { success } = require('../utils/response');

// @R26 -- WEEKLY ROOM LEADERBOARD (TOP 10 + OWN RANK)
async function getRoomLeaderboard(req, res, next) {
  try {
    const roomId = parseInt(req.params.roomId, 10);
    const userId = req.user.userId;
    if (isNaN(roomId)) throw new BadRequestError('Invalid room ID');

    // Verify room exists and user is member
    const memCheck = await db.query(
      `SELECT r.name AS room_name, (rm.user_id IS NOT NULL) AS is_member
       FROM rooms r
       LEFT JOIN room_members rm ON rm.room_id = r.room_id AND rm.user_id = $2
       WHERE r.room_id = $1;`,
      [roomId, userId]
    );
    if (memCheck.rows.length === 0) throw new NotFoundError('Room not found');
    if (!memCheck.rows[0].is_member) {
      throw new ForbiddenError('You must be a member of the room to view its leaderboard');
    }

    // Weekly query: Points earned since Monday 00:00:00 IST of current week (@R26)
    const leaderboardSql = `
      WITH weekly_room_points AS (
        SELECT rm.user_id,
               u.name,
               COALESCE(SUM(pe.points), 0)::integer AS weekly_points
        FROM room_members rm
        JOIN users u ON u.user_id = rm.user_id
        LEFT JOIN points_events pe ON pe.user_id = rm.user_id
          AND pe.created_at >= (date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')
          AND (
            pe.doubt_id IN (SELECT doubt_id FROM doubts WHERE room_id = $1)
            OR pe.answer_id IN (SELECT answer_id FROM answers a JOIN doubts d ON d.doubt_id = a.doubt_id WHERE d.room_id = $1)
            OR pe.event_type IN ('session_completed', 'daily_goal')
          )
        WHERE rm.room_id = $1
        GROUP BY rm.user_id, u.name
      ),
      ranked AS (
        SELECT user_id,
               name,
               weekly_points,
               DENSE_RANK() OVER (ORDER BY weekly_points DESC, name ASC)::integer AS rank
        FROM weekly_room_points
      )
      SELECT user_id,
             name,
             weekly_points,
             rank,
             (user_id = $2) AS is_self
      FROM ranked
      ORDER BY rank ASC, name ASC;
    `;

    const result = await db.query(leaderboardSql, [roomId, userId]);
    const allRanked = result.rows;

    const top10 = allRanked.slice(0, 10);
    const selfRow = allRanked.find(r => r.user_id === userId);

    return success(res, {
      room_id: roomId,
      room_name: memCheck.rows[0].room_name,
      leaderboard: top10,
      own_rank: selfRow || null,
      total_members: allRanked.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRoomLeaderboard,
};
