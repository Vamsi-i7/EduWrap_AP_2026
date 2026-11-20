const crypto = require('crypto');
const db = require('../config/db');
const { getCollection } = require('../config/mongo');
const { BadRequestError, ForbiddenError, NotFoundError } = require('../utils/errors');
const { success } = require('../utils/response');
const { calculateNextReview } = require('../utils/leitner');
const { getTodayIST } = require('../utils/dateUtils');

// Helper to check deck access
async function verifyDeckAccess(deckId, userId) {
  const querySql = `
    SELECT d.deck_id,
           d.title,
           d.visibility,
           d.owner_id,
           d.room_id,
           (d.visibility = 'public' OR d.owner_id = $2 OR (d.visibility = 'room' AND rm.user_id IS NOT NULL)) AS can_access
    FROM decks d
    LEFT JOIN room_members rm ON rm.room_id = d.room_id AND rm.user_id = $2
    WHERE d.deck_id = $1;
  `;
  const result = await db.query(querySql, [deckId, userId]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

// @R14 -- GET DUE CARDS FOR PRACTICE (UP TO 20)
async function getDueCards(req, res, next) {
  try {
    const deckId = parseInt(req.params.deckId, 10);
    const userId = req.user.userId;
    if (isNaN(deckId)) throw new BadRequestError('Invalid deck ID');

    const deck = await verifyDeckAccess(deckId, userId);
    if (!deck) throw new NotFoundError('Deck not found');
    if (!deck.can_access) throw new ForbiddenError('You do not have access to practice this deck');

    // Cards due today (or overdue), plus unstudied cards (which are due immediately), limit 20
    const querySql = `
      SELECT c.card_id,
             c.deck_id,
             c.front,
             c.back,
             c.source_answer_id,
             COALESCE(cp.box, 1)          AS current_box,
             COALESCE(cp.due_date, CURRENT_DATE) AS due_date,
             cp.last_reviewed,
             (cp.card_id IS NULL)         AS is_new
      FROM cards c
      LEFT JOIN card_progress cp ON cp.card_id = c.card_id AND cp.user_id = $2
      WHERE c.deck_id = $1
        AND (cp.due_date IS NULL OR cp.due_date <= CURRENT_DATE)
      ORDER BY is_new DESC, current_box ASC, cp.due_date ASC
      LIMIT 20;
    `;
    const result = await db.query(querySql, [deckId, userId]);

    return success(res, {
      deck: { deck_id: deck.deck_id, title: deck.title },
      due_count: result.rows.length,
      cards: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

// @W17 & @W18 -- SUBMIT PRACTICE SESSION (DUAL-DATABASE TRANSACTION)
async function submitSession(req, res, next) {
  const pgClient = await db.getClient();
  try {
    const deckId = parseInt(req.params.deckId, 10);
    const userId = req.user.userId;
    const { duration_seconds = 0, answers = [] } = req.body;

    if (isNaN(deckId)) throw new BadRequestError('Invalid deck ID');
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new BadRequestError('Answers array cannot be empty');
    }

    const deck = await verifyDeckAccess(deckId, userId);
    if (!deck) throw new NotFoundError('Deck not found');
    if (!deck.can_access) throw new ForbiddenError('You do not have access to this deck');

    const sessionRef = `sess_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const todayIST = getTodayIST();
    let knownCount = 0;
    let missedCount = 0;
    const updatedCards = [];

    // 1. Begin PostgreSQL Transaction
    await pgClient.query('BEGIN');

    // Fetch user daily goal
    const userRes = await pgClient.query('SELECT daily_goal FROM users WHERE user_id = $1', [userId]);
    const dailyGoal = userRes.rows[0].daily_goal;

    // Process each card
    for (const ans of answers) {
      const cardId = parseInt(ans.card_id, 10);
      const isKnown = Boolean(ans.known);

      if (isKnown) knownCount++;
      else missedCount++;

      // Fetch current box if exists
      const progRes = await pgClient.query(
        'SELECT box FROM card_progress WHERE user_id = $1 AND card_id = $2',
        [userId, cardId]
      );
      const currentBox = progRes.rows.length > 0 ? progRes.rows[0].box : 1;
      const { nextBox, dueDate } = calculateNextReview(currentBox, isKnown);

      // Upsert card_progress (@W17)
      const upsertSql = `
        INSERT INTO card_progress (user_id, card_id, box, due_date, last_reviewed)
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT (user_id, card_id)
        DO UPDATE SET box = EXCLUDED.box,
                      due_date = EXCLUDED.due_date,
                      last_reviewed = now()
        RETURNING card_id, box, due_date, last_reviewed;
      `;
      const updateRes = await pgClient.query(upsertSql, [userId, cardId, nextBox, dueDate]);
      updatedCards.push(updateRes.rows[0]);
    }

    // Award session completion points (+5 points)
    await pgClient.query(
      `INSERT INTO points_events (user_id, event_type, points, session_ref)
       VALUES ($1, 'session_completed', 5, $2);`,
      [userId, sessionRef]
    );

    // Upsert daily_activity in PostgreSQL
    const upsertDailySql = `
      INSERT INTO daily_activity (user_id, activity_date, cards_reviewed, sessions_count)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (user_id, activity_date)
      DO UPDATE SET cards_reviewed = daily_activity.cards_reviewed + EXCLUDED.cards_reviewed,
                    sessions_count = daily_activity.sessions_count + 1
      RETURNING cards_reviewed, sessions_count;
    `;
    const dailyRes = await pgClient.query(upsertDailySql, [userId, todayIST, answers.length]);
    const totalTodayCards = dailyRes.rows[0].cards_reviewed;

    let goalNewlyAchieved = false;
    if (totalTodayCards >= dailyGoal) {
      // Award daily goal bonus (+15 points), unique per (user_id, event_date)
      const goalRes = await pgClient.query(
        `INSERT INTO points_events (user_id, event_type, points, event_date)
         VALUES ($1, 'daily_goal', 15, $2)
         ON CONFLICT (user_id, event_date) WHERE event_type = 'daily_goal' DO NOTHING
         RETURNING event_id;`,
        [userId, todayIST]
      );
      if (goalRes.rows.length > 0) {
        goalNewlyAchieved = true;
      }
    }

    // Commit PostgreSQL Transaction
    await pgClient.query('COMMIT');

    const totalPointsEarned = 5 + (goalNewlyAchieved ? 15 : 0);

    // 2. Non-blocking Asynchronous MongoDB Logging
    setImmediate(async () => {
      try {
        const studySessionsCol = getCollection('study_sessions');
        await studySessionsCol.insertOne({
          user_id: userId,
          deck_id: deckId,
          session_ref: sessionRef,
          duration_seconds: parseInt(duration_seconds, 10) || 0,
          cards: answers,
          known_count: knownCount,
          missed_count: missedCount,
          points_earned: totalPointsEarned,
          created_at: new Date(),
        });

        const activityCol = getCollection('activity_events');
        await activityCol.insertOne({
          type: 'session_completed',
          actor_id: userId,
          room_id: deck.room_id || null,
          deck_id: deckId,
          text_summary: `Completed a practice session in "${deck.title}" (${knownCount} known, ${missedCount} missed)`,
          created_at: new Date(),
        });
      } catch (mongoErr) {
        console.warn('[MongoDB] Practice session background logging failed (non-critical):', mongoErr.message);
      }
    });

    return success(res, {
      session_ref: sessionRef,
      reviewed_count: answers.length,
      known_count: knownCount,
      missed_count: missedCount,
      accuracy_percentage: Math.round((knownCount / answers.length) * 100),
      points_earned: totalPointsEarned,
      goal_achieved: goalNewlyAchieved,
      today_cards_total: totalTodayCards,
      daily_goal: dailyGoal,
      cards: updatedCards,
    }, 200, 'Practice session saved successfully');

  } catch (err) {
    await pgClient.query('ROLLBACK');
    next(err);
  } finally {
    pgClient.release();
  }
}

module.exports = {
  getDueCards,
  submitSession,
};
