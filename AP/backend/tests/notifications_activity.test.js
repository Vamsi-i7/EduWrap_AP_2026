const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { getCollection } = require('../src/config/mongo');

describe('Notifications & Activity Feeds API', () => {
  let userToken = null;
  let userId = null;
  let notifId = null;

  before(async () => {
    const uRes = await request(app).post('/api/auth/register').send({
      name: 'Notification Tester',
      email: `notif_${Date.now()}@mail.com`,
      password: 'password123',
    });
    userToken = uRes.body.data.token;
    userId = uRes.body.data.user.user_id;

    // Seed test notification
    const notifCol = getCollection('notifications');
    const inserted = await notifCol.insertOne({
      recipient_id: userId,
      type: 'new_answer',
      message: 'Someone answered your doubt',
      link: '/doubts/1',
      is_read: false,
      created_at: new Date(),
    });
    notifId = inserted.insertedId.toString();

    // Seed test activity event
    const actCol = getCollection('activity_events');
    await actCol.insertOne({
      type: 'session_completed',
      actor_id: userId,
      room_id: null,
      text_summary: 'Reviewed 10 cards',
      created_at: new Date(),
    });
  });

  test('GET /api/notifications/unread-count returns unread count (1)', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.unread_count, 1);
  });

  test('GET /api/notifications returns notification list', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.notifications.length, 1);
    assert.equal(res.body.data.notifications[0].recipient_id, userId);
  });

  test('PATCH /api/notifications/:id/read marks notification as read', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.is_read, true);

    // Verify unread count is now 0
    const countRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(countRes.body.data.unread_count, 0);
  });

  test('GET /api/activity/feed returns activity stream', async () => {
    const res = await request(app)
      .get('/api/activity/feed')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.activities));
  });

  after(async () => {
    if (userId) {
      await db.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
    await db.pool.end();
  });
});
