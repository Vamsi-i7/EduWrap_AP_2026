const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Spaced Repetition & Practice API', () => {
  let userToken = null;
  let userId = null;
  let subjectId = null;
  let deckId = null;
  let card1Id = null;
  let card2Id = null;

  before(async () => {
    // Subject
    const sRes = await db.query(
      `INSERT INTO subjects (name) VALUES ('Computer Architecture')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING subject_id;`
    );
    subjectId = sRes.rows[0].subject_id;

    // User with daily_goal = 10
    const uRes = await request(app).post('/api/auth/register').send({
      name: 'Practice Learner',
      email: `learner_${Date.now()}@mail.com`,
      password: 'password123',
      daily_goal: 10,
    });
    userToken = uRes.body.data.token;
    userId = uRes.body.data.user.user_id;

    // Deck
    const dRes = await request(app)
      .post('/api/decks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'CPU Pipelining & Caching',
        subject_id: subjectId,
        visibility: 'public',
      });
    deckId = dRes.body.data.deck.deck_id;

    // Add 2 Cards
    const c1 = await request(app)
      .post(`/api/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: 'What is a data hazard?', back: 'Instruction depends on result of earlier instruction' });
    card1Id = c1.body.data.card.card_id;

    const c2 = await request(app)
      .post(`/api/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ front: 'What is temporal locality?', back: 'Recently accessed memory is likely to be accessed again soon' });
    card2Id = c2.body.data.card.card_id;
  });

  test('GET /api/practice/:deckId/due returns unreviewed cards as due in box 1', async () => {
    const res = await request(app)
      .get(`/api/practice/${deckId}/due`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.due_count, 2);
    assert.equal(res.body.data.cards[0].current_box, 1);
    assert.equal(res.body.data.cards[0].is_new, true);
  });

  test('POST /api/practice/:deckId/submit advances box for known card and drops box for missed card', async () => {
    const res = await request(app)
      .post(`/api/practice/${deckId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        duration_seconds: 45,
        answers: [
          { card_id: card1Id, known: true },  // box 1 -> 2
          { card_id: card2Id, known: false }, // box 1 -> 1
        ],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.reviewed_count, 2);
    assert.equal(res.body.data.known_count, 1);
    assert.equal(res.body.data.missed_count, 1);
    assert.equal(res.body.data.accuracy_percentage, 50);
    assert.equal(res.body.data.points_earned, 5); // 5 points for session completion

    // Verify card1 advanced to box 2 in database
    const card1Prog = await db.query('SELECT box FROM card_progress WHERE user_id = $1 AND card_id = $2', [userId, card1Id]);
    assert.equal(card1Prog.rows[0].box, 2);

    // Verify card2 is at box 1
    const card2Prog = await db.query('SELECT box FROM card_progress WHERE user_id = $1 AND card_id = $2', [userId, card2Id]);
    assert.equal(card2Prog.rows[0].box, 1);

    // Verify daily_activity recorded
    const dailyProg = await db.query('SELECT cards_reviewed, sessions_count FROM daily_activity WHERE user_id = $1', [userId]);
    assert.equal(dailyProg.rows[0].cards_reviewed, 2);
    assert.equal(dailyProg.rows[0].sessions_count, 1);
  });

  test('Second session on known card advances it from box 2 to box 3', async () => {
    const res = await request(app)
      .post(`/api/practice/${deckId}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        duration_seconds: 30,
        answers: [
          { card_id: card1Id, known: true }, // box 2 -> 3
        ],
      });

    assert.equal(res.status, 200);
    const card1Prog = await db.query('SELECT box FROM card_progress WHERE user_id = $1 AND card_id = $2', [userId, card1Id]);
    assert.equal(card1Prog.rows[0].box, 3);
  });

  after(async () => {
    if (userId) {
      await db.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
    await db.pool.end();
  });
});
