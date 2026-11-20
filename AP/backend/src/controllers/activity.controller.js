const db = require('../config/db');
const { getCollection } = require('../config/mongo');
const { BadRequestError, ForbiddenError } = require('../utils/errors');
const { success } = require('../utils/response');

// GET GLOBAL ACTIVITY FEED FOR USER'S ROOMS
async function getFeed(req, res, next) {
  try {
    const userId = req.user.userId;

    // Get user's room IDs from PostgreSQL
    const roomsRes = await db.query('SELECT room_id FROM room_members WHERE user_id = $1', [userId]);
    const roomIds = roomsRes.rows.map(r => r.room_id);

    const activityCol = getCollection('activity_events');
    const cursor = await activityCol.find({
      $or: [
        { room_id: { $in: roomIds } },
        { actor_id: userId },
      ],
    });
    const activities = await cursor.sort({ created_at: -1 }).limit(30).toArray();

    return success(res, { activities });
  } catch (err) {
    next(err);
  }
}

// GET ROOM SPECIFIC ACTIVITY FEED
async function getRoomFeed(req, res, next) {
  try {
    const roomId = parseInt(req.params.roomId, 10);
    const userId = req.user.userId;
    if (isNaN(roomId)) throw new BadRequestError('Invalid room ID');

    // Check membership
    const memRes = await db.query('SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
    if (memRes.rows.length === 0) {
      throw new ForbiddenError('You must be a member of the room to view its activity feed');
    }

    const activityCol = getCollection('activity_events');
    const cursor = await activityCol.find({ room_id: roomId });
    const activities = await cursor.sort({ created_at: -1 }).limit(30).toArray();

    return success(res, { room_id: roomId, activities });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFeed,
  getRoomFeed,
};
