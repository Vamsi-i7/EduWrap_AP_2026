const { Pool } = require('pg');
const env = require('./env');

const isCloudOrSsl = env.databaseUrl && (
  env.databaseUrl.includes('neon.tech') ||
  env.databaseUrl.includes('sslmode=') ||
  env.databaseUrl.includes('ssl=true') ||
  env.nodeEnv === 'production'
);

const poolConfig = {
  connectionString: env.databaseUrl,
  max: env.nodeEnv === 'production' ? 10 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

if (isCloudOrSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

// Pass search_path startup option for direct Neon or local Postgres
if (!env.databaseUrl.includes('-pooler')) {
  poolConfig.options = '-c search_path=eduwrap,public';
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected client error:', err.message);
});

module.exports = {
  pool,
  query: async (text, params) => {
    // If using pooler, ensure search_path is set
    if (env.databaseUrl.includes('-pooler')) {
      const client = await pool.connect();
      try {
        await client.query('SET search_path TO eduwrap, public');
        return await client.query(text, params);
      } finally {
        client.release();
      }
    }
    return pool.query(text, params);
  },
  getClient: async () => {
    const client = await pool.connect();
    if (env.databaseUrl.includes('-pooler')) {
      await client.query('SET search_path TO eduwrap, public');
    }
    return client;
  },
};
