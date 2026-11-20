const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Users & Profile API', () => {
  let token = null;
  let userId = null;

  before(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Profile Tester',
        email: `profile_${Date.now()}@mail.com`,
        password: 'password123',
        daily_goal: 20,
      });
    token = res.body.data.token;
    userId = res.body.data.user.user_id;
  });

  test('GET /api/users/profile returns profile with aggregated counters', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.profile.user_id, userId);
    assert.equal(res.body.data.profile.name, 'Profile Tester');
    assert.equal(res.body.data.profile.total_points, 0);
    assert.equal(res.body.data.profile.rooms_joined, 0);
    assert.equal(res.body.data.profile.decks_created, 0);
  });

  test('PATCH /api/users/profile updates name and daily_goal', async () => {
    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        daily_goal: 30,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.name, 'Updated Name');
    assert.equal(res.body.data.user.daily_goal, 30);
  });

  test('PATCH /api/users/profile rejects invalid daily_goal with 400', async () => {
    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        daily_goal: 42,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('GET /api/users/:id/stats returns public user statistics', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}/stats`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.name, 'Updated Name');
    assert.equal(res.body.data.user.total_points, 0);
    assert.equal(res.body.data.user.email, undefined); // email should be private
  });

  after(async () => {
    if (userId) {
      await db.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
    await db.pool.end();
  });
});
