const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Decks & Cards API', () => {
  let userToken = null;
  let otherToken = null;
  let userId = null;
  let otherId = null;
  let subjectId = null;
  let deckId = null;
  let cardId = null;

  before(async () => {
    // Ensure subject exists
    const sRes = await db.query(
      `INSERT INTO subjects (name) VALUES ('Algorithms & Data Structures')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING subject_id;`
    );
    subjectId = sRes.rows[0].subject_id;

    const u1 = await request(app).post('/api/auth/register').send({
      name: 'Deck Author',
      email: `author_${Date.now()}@mail.com`,
      password: 'password123',
    });
    userToken = u1.body.data.token;
    userId = u1.body.data.user.user_id;

    const u2 = await request(app).post('/api/auth/register').send({
      name: 'Other Student',
      email: `other_${Date.now()}@mail.com`,
      password: 'password123',
    });
    otherToken = u2.body.data.token;
    otherId = u2.body.data.user.user_id;
  });

  test('POST /api/decks creates private deck', async () => {
    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Binary Trees & Graphs',
        description: 'Key algorithmic concepts',
        subject_id: subjectId,
        visibility: 'private',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.deck.title, 'Binary Trees & Graphs');
    assert.equal(res.body.data.deck.visibility, 'private');
    deckId = res.body.data.deck.deck_id;
  });

  test('GET /api/decks/:id blocks non-owner from viewing private deck (403)', async () => {
    const res = await request(app)
      .get(`/api/decks/${deckId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    assert.equal(res.status, 403);
  });

  test('POST /api/decks/:id/cards allows owner to add card', async () => {
    const res = await request(app)
      .post(`/api/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        front: 'What is the time complexity of searching a balanced BST?',
        back: 'O(log n)',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.card.back, 'O(log n)');
    cardId = res.body.data.card.card_id;
  });

  test('POST /api/decks/:id/cards blocks non-owner from adding card (403)', async () => {
    const res = await request(app)
      .post(`/api/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        front: 'Sneaky card front',
        back: 'Sneaky card back',
      });

    assert.equal(res.status, 403);
  });

  test('GET /api/decks/:id/cards returns cards to deck owner', async () => {
    const res = await request(app)
      .get(`/api/decks/${deckId}/cards`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.cards.length, 1);
    assert.equal(res.body.data.cards[0].card_id, cardId);
  });

  test('PATCH /api/decks/:id/cards/:cardId updates card content', async () => {
    const res = await request(app)
      .patch(`/api/decks/${deckId}/cards/${cardId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        back: 'O(log n) average and worst-case for self-balancing AVL/Red-Black trees',
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.card.back.includes('AVL'));
  });

  test('GET /api/decks returns paginated results', async () => {
    const res = await request(app)
      .get('/api/decks?page=1&limit=12')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.decks.length >= 1);
    assert.equal(res.body.data.pagination.page, 1);
  });

  test('DELETE /api/decks/:id/cards/:cardId deletes card', async () => {
    const res = await request(app)
      .delete(`/api/decks/${deckId}/cards/${cardId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.deleted_card_id, cardId);
  });

  after(async () => {
    if (userId || otherId) {
      await db.query('DELETE FROM users WHERE user_id IN ($1, $2)', [userId, otherId]);
    }
    await db.pool.end();
  });
});
