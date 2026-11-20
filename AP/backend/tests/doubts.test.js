const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Doubts, Answers, Upvotes & Acceptance API', () => {
  let askerToken = null;
  let askerId = null;
  let answererToken = null;
  let answererId = null;
  let subjectId = null;
  let roomId = null;
  let doubtId = null;
  let answerId = null;
  let deckId = null;

  before(async () => {
    // Subject
    const sRes = await db.query(
      `INSERT INTO subjects (name) VALUES ('Operating Systems Internal')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING subject_id;`
    );
    subjectId = sRes.rows[0].subject_id;

    // Asker
    const u1 = await request(app).post('/api/auth/register').send({
      name: 'Asker Student',
      email: `asker_${Date.now()}@mail.com`,
      password: 'password123',
    });
    askerToken = u1.body.data.token;
    askerId = u1.body.data.user.user_id;

    // Answerer
    const u2 = await request(app).post('/api/auth/register').send({
      name: 'Answerer Student',
      email: `ans_${Date.now()}@mail.com`,
      password: 'password123',
    });
    answererToken = u2.body.data.token;
    answererId = u2.body.data.user.user_id;

    // Room created by Asker
    const rRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${askerToken}`)
      .send({
        name: 'OS Kernel Circle',
        subject_id: subjectId,
        visibility: 'public',
      });
    roomId = rRes.body.data.room.room_id;

    // Answerer joins room
    await request(app)
      .post(`/api/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${answererToken}`);

    // Asker creates a deck for testing save-as-card
    const dRes = await request(app)
      .post('/api/decks')
      .set('Authorization', `Bearer ${askerToken}`)
      .send({
        title: 'OS Saved Cards',
        subject_id: subjectId,
        visibility: 'private',
      });
    deckId = dRes.body.data.deck.deck_id;
  });

  test('POST /api/doubts creates doubt and awards +5 points to author', async () => {
    const res = await request(app)
      .post('/api/doubts')
      .set('Authorization', `Bearer ${askerToken}`)
      .send({
        room_id: roomId,
        title: 'How does copy-on-write (COW) work during fork()?',
        body: 'Looking for a step-by-step breakdown of page table flags and trap handling.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    doubtId = res.body.data.doubt.doubt_id;

    // Verify +5 points in points_events
    const pe = await db.query('SELECT points FROM points_events WHERE user_id = $1 AND doubt_id = $2', [askerId, doubtId]);
    assert.equal(pe.rows[0].points, 5);
  });

  test('POST /api/doubts/:id/answers posts answer and awards +10 points to answerer', async () => {
    const res = await request(app)
      .post(`/api/doubts/${doubtId}/answers`)
      .set('Authorization', `Bearer ${answererToken}`)
      .send({
        body: 'During fork(), memory pages are marked read-only in both parent and child. A page fault traps on write, allocating a fresh physical frame.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    answerId = res.body.data.answer.answer_id;

    // Verify +10 points
    const pe = await db.query('SELECT points FROM points_events WHERE user_id = $1 AND answer_id = $2 AND event_type = $3', [answererId, answerId, 'post_answer']);
    assert.equal(pe.rows[0].points, 10);
  });

  test('POST /api/answers/:id/upvote toggles upvote and awards +2 points to author', async () => {
    // Asker upvotes Answerer's answer
    const res = await request(app)
      .post(`/api/answers/${answerId}/upvote`)
      .set('Authorization', `Bearer ${askerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.upvoted, true);
    assert.equal(res.body.data.upvote_count, 1);

    // Verify +2 points
    const pe = await db.query('SELECT points FROM points_events WHERE user_id = $1 AND voter_id = $2', [answererId, askerId]);
    assert.equal(pe.rows[0].points, 2);

    // Toggle again to un-upvote
    const res2 = await request(app)
      .post(`/api/answers/${answerId}/upvote`)
      .set('Authorization', `Bearer ${askerToken}`);

    assert.equal(res2.status, 200);
    assert.equal(res2.body.data.upvoted, false);
    assert.equal(res2.body.data.upvote_count, 0);

    // Verify points event cascaded/deleted
    const pe2 = await db.query('SELECT points FROM points_events WHERE user_id = $1 AND voter_id = $2', [answererId, askerId]);
    assert.equal(pe2.rows.length, 0);
  });

  test('POST /api/answers/:id/accept allows ONLY doubt author to accept answer (+15 points)', async () => {
    // Answerer tries to accept (should fail with 403)
    const failRes = await request(app)
      .post(`/api/answers/${answerId}/accept`)
      .set('Authorization', `Bearer ${answererToken}`);
    assert.equal(failRes.status, 403);

    // Asker accepts Answerer's answer
    const okRes = await request(app)
      .post(`/api/answers/${answerId}/accept`)
      .set('Authorization', `Bearer ${askerToken}`);

    assert.equal(okRes.status, 200);
    assert.equal(okRes.body.data.is_accepted, true);

    // Verify +15 points
    const pe = await db.query(
      `SELECT points FROM points_events WHERE user_id = $1 AND answer_id = $2 AND event_type = 'answer_accepted'`,
      [answererId, answerId]
    );
    assert.equal(pe.rows[0].points, 15);
  });

  test('POST /api/answers/:id/save-as-card saves answer into flashcard deck', async () => {
    const res = await request(app)
      .post(`/api/answers/${answerId}/save-as-card`)
      .set('Authorization', `Bearer ${askerToken}`)
      .send({
        deck_id: deckId,
        front: 'What happens on write to a copy-on-write page?',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.card.source_answer_id, answerId);
  });

  after(async () => {
    if (askerId || answererId) {
      await db.query('DELETE FROM users WHERE user_id IN ($1, $2)', [askerId, answererId]);
    }
    await db.pool.end();
  });
});
