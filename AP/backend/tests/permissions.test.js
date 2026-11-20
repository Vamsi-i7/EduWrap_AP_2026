const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Core Acceptance Tests: Permission Checks & Access Control (Mouli)', () => {
  let userAToken = null; // Owner of private resources
  let userAId = null;
  let userBToken = null; // Outside non-member
  let userBId = null;
  let subjectId = null;
  let privateRoomId = null;
  let privateDeckId = null;
  let roomScopedDeckId = null;
  let doubtId = null;
  let answerId = null;

  before(async () => {
    // 1. Ensure a subject exists
    const subRes = await db.query(
      `INSERT INTO subjects (name) VALUES ('Computer Architecture & Systems')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING subject_id;`
    );
    subjectId = subRes.rows[0].subject_id;

    // 2. Register User A (Resource Creator)
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Alpha',
        email: `usera_${Date.now()}@mail.com`,
        password: 'password123',
        daily_goal: 20,
      });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.user_id;

    // 3. Register User B (Non-member / Outsider)
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User Beta',
        email: `userb_${Date.now()}@mail.com`,
        password: 'password123',
        daily_goal: 20,
      });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.user_id;

    // 4. User A creates a Private Room
    const rRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Alpha Secret Study Circle',
        description: 'Private group for advanced system study',
        subject_id: subjectId,
        visibility: 'private',
      });
    privateRoomId = rRes.body.data.room.room_id;

    // 5. User A creates a Private Deck
    const dRes = await request(app)
      .post('/api/decks')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Alpha Private Flashcards',
        description: 'Personal study cards not shared',
        subject_id: subjectId,
        visibility: 'private',
      });
    privateDeckId = dRes.body.data.deck.deck_id;

    // 6. User A creates a Room-Scoped Deck
    const rdRes = await request(app)
      .post('/api/decks')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Alpha Room Deck',
        description: 'Deck only accessible to room members',
        subject_id: subjectId,
        visibility: 'room',
        room_id: privateRoomId,
      });
    roomScopedDeckId = rdRes.body.data.deck.deck_id;

    // 7. User A posts a Doubt in the Private Room
    const qRes = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        room_id: privateRoomId,
        title: 'How does Tomasulo algorithm avoid WAR/WAW hazards?',
        body: 'Looking for detailed explanation of register renaming reservation stations.',
      });
    doubtId = qRes.body.data.doubt.doubt_id;

    // 8. User A posts an Answer
    const aRes = await request(app)
      .post(`/api/doubts/${doubtId}/answers`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        body: 'Reservation stations dynamically rename architectural registers, buffering values so dependent instructions execute as soon as operands are ready.',
      });
    answerId = aRes.body.data.answer.answer_id;
  });

  // Test 1: Direct link to private room by non-member
  test('Non-member accessing private room via direct link returns 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/rooms/${privateRoomId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message.toLowerCase(), /forbidden|member|access/);
  });

  // Test 2: Direct link to private deck by non-owner
  test('Non-owner accessing private deck returns 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/decks/${privateDeckId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // Test 3: Direct link to room-scoped deck by non-room member
  test('Non-room-member accessing room-scoped deck returns 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/decks/${roomScopedDeckId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // Test 4: Direct link to doubts in private room by non-member
  test('Non-member fetching doubts of a private room returns 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/doubts?room_id=${privateRoomId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // Test 5: Non-author attempting to edit another user's deck
  test('Non-author updating another user deck returns 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/decks/${privateDeckId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        title: 'Hacked Title Attempt',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // Test 6: Non-author attempting to delete another user's deck
  test('Non-author deleting another user deck returns 403 Forbidden', async () => {
    const res = await request(app)
      .delete(`/api/decks/${privateDeckId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // Test 7: Non-asker attempting to accept an answer
  test('Non-asker accepting an answer returns 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/answers/${answerId}/accept`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // Test 8: Non-owner attempting to delete a study room
  test('Non-owner deleting study room returns 403 Forbidden', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${privateRoomId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // Test 9: Bypass API validation to verify DB check constraint on daily_goal
  test('Database check constraint enforces valid daily_goal in (10, 20, 30, 50)', async () => {
    await assert.rejects(
      async () => {
        await db.query(`
          INSERT INTO users (name, email, password_hash, daily_goal)
          VALUES ('Invalid Goal', 'invalid_goal@mail.com', 'hash', 25);
        `);
      },
      /check constraint|ck_users_daily_goal/i
    );
  });

  // Test 10: Database check constraint enforces 8-character invite code
  test('Database check constraint enforces char_length(invite_code) = 8', async () => {
    await assert.rejects(
      async () => {
        await db.query(`
          INSERT INTO rooms (name, subject_id, visibility, invite_code, owner_id)
          VALUES ('Bad Invite Room', $1, 'public', 'SHORT', $2);
        `, [subjectId, userAId]);
      },
      /check constraint|ck_rooms_invite/i
    );
  });
});
