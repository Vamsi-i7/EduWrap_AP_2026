const { ObjectId } = require('mongodb');
const { getCollection } = require('../config/mongo');
const { success } = require('../utils/response');

// GET USER NOTIFICATIONS
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.userId;
    const notifCol = getCollection('notifications');

    const cursor = await notifCol.find({ recipient_id: userId });
    const notifications = await cursor.sort({ created_at: -1 }).limit(30).toArray();

    return success(res, { notifications });
  } catch (err) {
    next(err);
  }
}

// GET UNREAD COUNT (OPTIMIZED FOR 30s POLLING)
async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.userId;
    const notifCol = getCollection('notifications');

    const unreadCount = await notifCol.countDocuments({
      recipient_id: userId,
      is_read: false,
    });

    return success(res, { unread_count: unreadCount });
  } catch (err) {
    next(err);
  }
}

// MARK SINGLE NOTIFICATION AS READ
async function markAsRead(req, res, next) {
  try {
    const notifId = req.params.id;
    const userId = req.user.userId;
    const notifCol = getCollection('notifications');

    let queryId = notifId;
    try {
      if (ObjectId.isValid(notifId)) {
        queryId = new ObjectId(notifId);
      }
    } catch (_) {}

    await notifCol.updateOne(
      { _id: queryId, recipient_id: userId },
      { $set: { is_read: true } }
    );

    return success(res, { id: notifId, is_read: true }, 200, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
}

// MARK ALL AS READ
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const notifCol = getCollection('notifications');

    await notifCol.updateMany(
      { recipient_id: userId, is_read: false },
      { $set: { is_read: true } }
    );

    return success(res, null, 200, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
