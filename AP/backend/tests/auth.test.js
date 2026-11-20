const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Auth API Endpoints', () => {
  const testEmail = `test_${Date.now()}@mail.com`;
  let authToken = null;
  let createdUserId = null;

  test('POST /api/auth/register creates user and returns 24h JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Vamsi Test',
        email: testEmail,
        password: 'securePassword123',
        daily_goal: 20,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, testEmail);
    assert.equal(res.body.data.user.daily_goal, 20);
    authToken = res.body.data.token;
    createdUserId = res.body.data.user.user_id;
  });

  test('POST /api/auth/register rejects duplicate email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Test',
        email: testEmail,
        password: 'securePassword123',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'securePassword123',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.user_id, createdUserId);
  });

  test('POST /api/auth/login rejects incorrect password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'wrongPassword',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('POST /api/auth/google rejects missing credential with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('GET /api/auth/me returns current user profile when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.user_id, createdUserId);
    assert.equal(res.body.data.user.name, 'Vamsi Test');
  });

  test('GET /api/auth/me rejects missing token with 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('POST /api/auth/google rejects missing credential with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  after(async () => {
    if (createdUserId) {
      await db.query('DELETE FROM users WHERE user_id = $1', [createdUserId]);
    }
    await db.pool.end();
  });
});
