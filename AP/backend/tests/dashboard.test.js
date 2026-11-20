const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

const { getTodayIST } = require('../src/utils/dateUtils');

describe('Dashboard, Habit & Leaderboard API', () => {
  let userToken = null;
  let userId = null;
  let roomId = null;
  let subjectId = null;

  before(async () => {
    // Subject
    const sRes = await db.query(
      `INSERT INTO subjects (name) VALUES ('Machine Learning Systems')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING subject_id;`
    );
    subjectId = sRes.rows[0].subject_id;

    // User
    const uRes = await request(app).post('/api/auth/register').send({
      name: 'Dashboard Champion',
      email: `dash_${Date.now()}@mail.com`,
      password: 'password123',
      daily_goal: 20,
    });
    userToken = uRes.body.data.token;
    userId = uRes.body.data.user.user_id;

    // Room
    const rRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'ML Study Circle',
        subject_id: subjectId,
        visibility: 'public',
      });
    roomId = rRes.body.data.room.room_id;

    // Award sample points in current week
    await db.query(
      `INSERT INTO points_events (user_id, event_type, points, session_ref)
       VALUES ($1, 'session_completed', 25, 'sess_test_1');`,
      [userId]
    );

    // Record sample daily activity
    const todayIST = getTodayIST();
    await db.query(
      `INSERT INTO daily_activity (user_id, activity_date, cards_reviewed, sessions_count)
       VALUES ($1, $2, 15, 1)
       ON CONFLICT (user_id, activity_date)
       DO UPDATE SET cards_reviewed = 15;`,
      [userId, todayIST]
    );
  });

  test('GET /api/dashboard returns aggregated overview for home page', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.user_id, userId);
    assert.equal(res.body.data.habit.daily_goal, 20);
    assert.equal(res.body.data.habit.today_cards, 15);
    assert.equal(res.body.data.habit.percentage, 75);
    assert.equal(res.body.data.my_rooms.length, 1);
    assert.equal(res.body.data.my_rooms[0].room_id, roomId);
  });

  test('GET /api/dashboard/habit returns 7-day chart and streak statistics', async () => {
    const res = await request(app)
      .get('/api/dashboard/habit')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.chart.length, 7);
    assert.ok(res.body.data.current_streak >= 1);
  });

  test('GET /api/leaderboard/rooms/:roomId returns weekly leaderboard with self rank', async () => {
    const res = await request(app)
      .get(`/api/leaderboard/rooms/${roomId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.room_id, roomId);
    assert.ok(res.body.data.leaderboard.length >= 1);
    assert.equal(res.body.data.own_rank.user_id, userId);
    assert.equal(res.body.data.own_rank.rank, 1);
  });

  after(async () => {
    if (userId) {
      await db.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
    await db.pool.end();
  });
});
