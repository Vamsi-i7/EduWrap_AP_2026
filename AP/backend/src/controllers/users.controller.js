const db = require('../config/db');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const { success } = require('../utils/response');

// @R02 -- GET USER PROFILE WITH AGGREGATED STATS
async function getProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const querySql = `
      SELECT u.user_id,
             u.name,
             u.email,
             u.daily_goal,
             u.created_at,
             COALESCE(SUM(pe.points), 0)::integer AS total_points,
             COUNT(DISTINCT ub.badge_id)::integer AS badges_count,
             COUNT(DISTINCT rm.room_id)::integer  AS rooms_joined,
             COUNT(DISTINCT d.deck_id)::integer   AS decks_created
      FROM users u
      LEFT JOIN points_events pe ON pe.user_id = u.user_id
      LEFT JOIN user_badges ub   ON ub.user_id = u.user_id
      LEFT JOIN room_members rm  ON rm.user_id = u.user_id
      LEFT JOIN decks d          ON d.owner_id = u.user_id
      WHERE u.user_id = $1
      GROUP BY u.user_id, u.name, u.email, u.daily_goal, u.created_at;
    `;
    const result = await db.query(querySql, [userId]);
    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    const badgesSql = `
      SELECT b.badge_id,
             b.name,
             b.description,
             (ub.user_id IS NOT NULL) AS is_earned,
             ub.awarded_at
      FROM badges b
      LEFT JOIN user_badges ub ON ub.badge_id = b.badge_id AND ub.user_id = $1
      ORDER BY is_earned DESC, b.badge_id ASC;
    `;
    const badgesRes = await db.query(badgesSql, [userId]);

    return success(res, {
      profile: result.rows[0],
      badges: badgesRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

// @W02 & @W03 -- UPDATE NAME AND/OR DAILY GOAL
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const { name, daily_goal } = req.body;

    if (name === undefined && daily_goal === undefined) {
      throw new BadRequestError('At least one of name or daily_goal must be provided');
    }

    const updates = [];
    const params = [];
    let pIdx = 1;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
        throw new BadRequestError('Name must be between 2 and 60 characters');
      }
      updates.push(`name = $${pIdx++}`);
      params.push(name.trim());
    }

    if (daily_goal !== undefined) {
      const parsedGoal = parseInt(daily_goal, 10);
      if (![10, 20, 30, 50].includes(parsedGoal)) {
        throw new BadRequestError('Daily goal must be 10, 20, 30, or 50 cards');
      }
      updates.push(`daily_goal = $${pIdx++}`);
      params.push(parsedGoal);
    }

    params.push(userId);
    const updateSql = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE user_id = $${pIdx}
      RETURNING user_id, name, email, daily_goal, created_at;
    `;

    const result = await db.query(updateSql, params);
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    return success(res, { user: result.rows[0] }, 200, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
}

// PUBLIC STATS FOR ANY USER
async function getPublicStats(req, res, next) {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      throw new BadRequestError('Invalid user ID parameter');
    }

    const querySql = `
      SELECT u.user_id,
             u.name,
             u.created_at,
             COALESCE(SUM(pe.points), 0)::integer AS total_points,
             COUNT(DISTINCT ub.badge_id)::integer AS badges_count
      FROM users u
      LEFT JOIN points_events pe ON pe.user_id = u.user_id
      LEFT JOIN user_badges ub   ON ub.user_id = u.user_id
      WHERE u.user_id = $1
      GROUP BY u.user_id, u.name, u.created_at;
    `;
    const result = await db.query(querySql, [targetUserId]);
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    return success(res, { user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getPublicStats,
};
