const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const env = require('../config/env');
const { BadRequestError, UnauthorizedError, ConflictError } = require('../utils/errors');
const { success } = require('../utils/response');

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      name: user.name,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

// @W01 -- REGISTER
async function register(req, res, next) {
  try {
    const { name, email, password, daily_goal = 20 } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
      throw new BadRequestError('Name must be between 2 and 60 characters');
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new BadRequestError('A valid email address is required');
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }
    const parsedGoal = parseInt(daily_goal, 10);
    if (![10, 20, 30, 50].includes(parsedGoal)) {
      throw new BadRequestError('Daily goal must be 10, 20, 30, or 50 cards');
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await db.query('SELECT user_id FROM users WHERE email = $1', [trimmedEmail]);
    if (existing.rows.length > 0) {
      throw new ConflictError('An account with this email already exists');
    }

    // Hash password with bcrypt (10 rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into PostgreSQL (@W01)
    const insertSql = `
      INSERT INTO users (name, email, password_hash, daily_goal)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, name, email, daily_goal, created_at;
    `;
    const result = await db.query(insertSql, [name.trim(), trimmedEmail, passwordHash, parsedGoal]);
    const user = result.rows[0];

    const token = generateToken(user);

    return success(res, {
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        daily_goal: user.daily_goal,
        created_at: user.created_at,
      },
    }, 201, 'Registration successful');
  } catch (err) {
    next(err);
  }
}

// @R01 -- LOGIN
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Fetch user credentials by email (@R01)
    const selectSql = `
      SELECT u.user_id,
             u.name,
             u.email,
             u.password_hash,
             u.daily_goal,
             u.created_at
      FROM users u
      WHERE u.email = $1;
    `;
    const result = await db.query(selectSql, [trimmedEmail]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateToken(user);

    return success(res, {
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        daily_goal: user.daily_goal,
        created_at: user.created_at,
      },
    }, 200, 'Login successful');
  } catch (err) {
    next(err);
  }
}

// @R03 -- CURRENT USER
async function getMe(req, res, next) {
  try {
    const selectSql = `
      SELECT u.user_id,
             u.name,
             u.email,
             u.daily_goal,
             u.created_at
      FROM users u
      WHERE u.user_id = $1;
    `;
    const result = await db.query(selectSql, [req.user.userId]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    return success(res, { user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// GOOGLE AUTH LOGIN / SIGNUP
async function googleLogin(req, res, next) {
  try {
    const { credential, daily_goal = 20 } = req.body;

    if (!credential) {
      throw new BadRequestError('Google credential token is required');
    }

    if (!env.googleClientId) {
      throw new BadRequestError('Google Authentication is not configured on the server (missing GOOGLE_CLIENT_ID)');
    }

    const client = new OAuth2Client(env.googleClientId);
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: env.googleClientId,
      });
      payload = ticket.getPayload();
    } catch (err) {
      throw new UnauthorizedError(`Invalid Google ID token: ${err.message}`);
    }

    if (!payload || !payload.email) {
      throw new BadRequestError('Unable to extract email from Google credential');
    }

    const email = payload.email.trim().toLowerCase();
    const name = (payload.name && payload.name.trim().length >= 2)
      ? payload.name.trim().slice(0, 60)
      : email.split('@')[0];

    // Check if user already exists
    const existing = await db.query(
      'SELECT user_id, name, email, daily_goal, created_at FROM users WHERE email = $1',
      [email]
    );

    let user;
    if (existing.rows.length === 0) {
      // Auto-register user with random secure hash
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomSecret, 10);
      const parsedGoal = [10, 20, 30, 50].includes(Number(daily_goal)) ? Number(daily_goal) : 20;

      const insertSql = `
        INSERT INTO users (name, email, password_hash, daily_goal)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, name, email, daily_goal, created_at;
      `;
      const insertRes = await db.query(insertSql, [name, email, passwordHash, parsedGoal]);
      user = insertRes.rows[0];
    } else {
      user = existing.rows[0];
    }

    const token = generateToken(user);

    return success(res, {
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        daily_goal: user.daily_goal,
        created_at: user.created_at,
      },
    }, 200, 'Authenticated with Google successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe,
  googleLogin,
};
