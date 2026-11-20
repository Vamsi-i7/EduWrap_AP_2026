const db = require('../config/db');
const { success } = require('../utils/response');
const { getTodayIST, getPastDaysIST, calculateStreak } = require('../utils/dateUtils');

// @R25 -- GET AGGREGATED DASHBOARD FOR HOME
async function getDashboardSummary(req, res, next) {
  try {
    const userId = req.user.userId;
    const todayIST = getTodayIST();

    // 1. Fetch user daily goal and total points
    const userRes = await db.query(
      `SELECT u.user_id,
              u.name,
              u.daily_goal,
              COALESCE(SUM(pe.points), 0)::integer AS total_points
       FROM users u
       LEFT JOIN points_events pe ON pe.user_id = u.user_id
       WHERE u.user_id = $1
       GROUP BY u.user_id, u.name, u.daily_goal;`,
      [userId]
    );
    const user = userRes.rows[0];

    // 2. Total due cards across all decks accessible to the user
    const dueSql = `
      SELECT COUNT(DISTINCT c.card_id)::integer AS due_count
      FROM cards c
      JOIN decks d ON d.deck_id = c.deck_id
      LEFT JOIN room_members rm ON rm.room_id = d.room_id AND rm.user_id = $1
      LEFT JOIN card_progress cp ON cp.card_id = c.card_id AND cp.user_id = $1
      WHERE (d.visibility = 'public' OR d.owner_id = $1 OR (d.visibility = 'room' AND rm.user_id IS NOT NULL))
        AND (cp.due_date IS NULL OR cp.due_date <= CURRENT_DATE);
    `;
    const dueRes = await db.query(dueSql, [userId]);
    const dueCardsCount = dueRes.rows[0].due_count;

    // 3. User's active rooms with counts
    const roomsSql = `
      SELECT r.room_id,
             r.name        AS room_name,
             r.visibility,
             s.name        AS subject_name,
             COUNT(DISTINCT rm2.user_id)::integer AS member_count,
             COUNT(DISTINCT d.doubt_id)::integer  AS doubt_count
      FROM rooms r
      JOIN room_members rm  ON rm.room_id = r.room_id AND rm.user_id = $1
      JOIN subjects s       ON s.subject_id = r.subject_id
      LEFT JOIN room_members rm2 ON rm2.room_id = r.room_id
      LEFT JOIN doubts d    ON d.room_id = r.room_id
      GROUP BY r.room_id, r.name, r.visibility, s.name
      ORDER BY r.created_at DESC
      LIMIT 5;
    `;
    const roomsRes = await db.query(roomsSql, [userId]);

    // 4. Recent doubts in user's rooms
    const doubtsSql = `
      SELECT d.doubt_id,
             d.room_id,
             r.name       AS room_name,
             d.title,
             d.created_at,
             COUNT(a.answer_id)::integer AS answer_count,
             COALESCE(BOOL_OR(a.is_accepted), false) AS is_resolved
      FROM doubts d
      JOIN rooms r         ON r.room_id = d.room_id
      JOIN room_members rm ON rm.room_id = d.room_id AND rm.user_id = $1
      LEFT JOIN answers a  ON a.doubt_id = d.doubt_id
      GROUP BY d.doubt_id, d.room_id, r.name, d.title, d.created_at
      ORDER BY d.created_at DESC
      LIMIT 5;
    `;
    const doubtsRes = await db.query(doubtsSql, [userId]);

    // 5. Today's cards reviewed & streak
    const activitySql = `
      SELECT activity_date::text, cards_reviewed, answers_posted
      FROM daily_activity
      WHERE user_id = $1 AND cards_reviewed > 0
      ORDER BY activity_date DESC;
    `;
    const actRes = await db.query(activitySql, [userId]);
    const activeDates = actRes.rows.map(r => r.activity_date);
    const { currentStreak, longestStreak } = calculateStreak(activeDates);

    const todayAct = actRes.rows.find(r => r.activity_date === todayIST);
    const todayCards = todayAct ? todayAct.cards_reviewed : 0;
    const goalPercentage = Math.min(100, Math.round((todayCards / user.daily_goal) * 100));

    return success(res, {
      user: {
        user_id: user.user_id,
        name: user.name,
        total_points: user.total_points,
      },
      habit: {
        daily_goal: user.daily_goal,
        today_cards: todayCards,
        percentage: goalPercentage,
        goal_met: todayCards >= user.daily_goal,
        current_streak: currentStreak,
        longest_streak: longestStreak,
      },
      due_cards_count: dueCardsCount,
      my_rooms: roomsRes.rows,
      recent_doubts: doubtsRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

// 7-DAY HABIT & ACTIVITY CHART
async function getHabitChart(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRes = await db.query('SELECT daily_goal FROM users WHERE user_id = $1', [userId]);
    const dailyGoal = userRes.rows[0].daily_goal;

    const past7Days = getPastDaysIST(7);
    const startDate = past7Days[0];
    const endDate = past7Days[past7Days.length - 1];

    const actSql = `
      SELECT activity_date::text, cards_reviewed, answers_posted
      FROM daily_activity
      WHERE user_id = $1 AND activity_date BETWEEN $2 AND $3;
    `;
    const actRes = await db.query(actSql, [userId, startDate, endDate]);
    const actMap = new Map();
    actRes.rows.forEach(r => actMap.set(r.activity_date, r));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const chart = past7Days.map(dateStr => {
      const entry = actMap.get(dateStr);
      const cards = entry ? entry.cards_reviewed : 0;
      const d = new Date(dateStr + 'T00:00:00Z');
      const dayName = dayNames[d.getUTCDay()];

      return {
        date: dateStr,
        day: dayName,
        cards_reviewed: cards,
        goal_met: cards >= dailyGoal,
      };
    });

    // All active dates for streak calculation
    const allActSql = `
      SELECT activity_date::text
      FROM daily_activity
      WHERE user_id = $1 AND cards_reviewed > 0
      ORDER BY activity_date DESC;
    `;
    const allAct = await db.query(allActSql, [userId]);
    const activeDates = allAct.rows.map(r => r.activity_date);
    const { currentStreak, longestStreak } = calculateStreak(activeDates);

    return success(res, {
      daily_goal: dailyGoal,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      chart,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardSummary,
  getHabitChart,
};
