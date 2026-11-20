const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Rooms & Membership API', () => {
  let ownerToken = null;
  let ownerId = null;
  let memberToken = null;
  let memberId = null;
  let subjectId = null;
  let publicRoomId = null;
  let privateRoomId = null;
  let privateInviteCode = null;

  before(async () => {
    // 1. Ensure a subject exists
    const subRes = await db.query(
      `INSERT INTO subjects (name) VALUES ('Database Systems')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING subject_id;`
    );
    subjectId = subRes.rows[0].subject_id;

    // 2. Register Owner
    const oRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Room Owner',
        email: `owner_${Date.now()}@mail.com`,
        password: 'password123',
      });
    ownerToken = oRes.body.data.token;
    ownerId = oRes.body.data.user.user_id;

    // 3. Register Member
    const mRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Room Joiner',
        email: `joiner_${Date.now()}@mail.com`,
        password: 'password123',
      });
    memberToken = mRes.body.data.token;
    memberId = mRes.body.data.user.user_id;
  });

  test('GET /api/rooms/subjects returns subjects list', async () => {
    const res = await request(app).get('/api/rooms/subjects');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.subjects));
    assert.ok(res.body.data.subjects.length > 0);
  });

  test('POST /api/rooms creates public room and generates 8-char invite code', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'DBMS Study Circle',
        description: 'Collaborative database learning',
        subject_id: subjectId,
        visibility: 'public',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.room.name, 'DBMS Study Circle');
    assert.equal(res.body.data.room.invite_code.length, 8);
    publicRoomId = res.body.data.room.room_id;
  });

  test('POST /api/rooms creates private room', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Secret Study Circle',
        description: 'Private group',
        subject_id: subjectId,
        visibility: 'private',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.room.visibility, 'private');
    privateRoomId = res.body.data.room.room_id;
    privateInviteCode = res.body.data.room.invite_code;
  });

  test('GET /api/rooms/:id blocks non-member from viewing private room (403)', async () => {
    const res = await request(app)
      .get(`/api/rooms/${privateRoomId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test('POST /api/rooms/join-by-code allows joining private room via valid invite code', async () => {
    const res = await request(app)
      .post('/api/rooms/join-by-code')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ invite_code: privateInviteCode });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('GET /api/rooms/:id allows member to view private room after joining', async () => {
    const res = await request(app)
      .get(`/api/rooms/${privateRoomId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.room.room_id, privateRoomId);
    assert.equal(res.body.data.room.is_member, true);
  });

  test('POST /api/rooms/:id/join allows joining public room', async () => {
    const res = await request(app)
      .post(`/api/rooms/${publicRoomId}/join`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('GET /api/rooms?filter=my returns user joined rooms', async () => {
    const res = await request(app)
      .get('/api/rooms?filter=my')
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.rooms.length, 2);
  });

  test('POST /api/rooms/:id/leave blocks owner from leaving', async () => {
    const res = await request(app)
      .post(`/api/rooms/${publicRoomId}/leave`)
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(res.status, 403);
  });

  test('DELETE /api/rooms/:id deletes room and cascades', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${publicRoomId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.deleted_room_id, publicRoomId);
  });

  after(async () => {
    if (ownerId || memberId) {
      await db.query('DELETE FROM users WHERE user_id IN ($1, $2)', [ownerId, memberId]);
    }
    await db.pool.end();
  });
});
