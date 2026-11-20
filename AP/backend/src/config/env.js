const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/eduwrap',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/eduwrap',
  jwtSecret: process.env.JWT_SECRET || 'eduwrap_jwt_secret_dev_key_fallback_t0055',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};
