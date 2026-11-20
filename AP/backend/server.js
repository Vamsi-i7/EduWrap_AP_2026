const app = require('./src/app');
const env = require('./src/config/env');
const { pool } = require('./src/config/db');
const { connectMongo, closeMongo } = require('./src/config/mongo');

async function startServer() {
  try {
    // 1. Verify PostgreSQL connection
    const pgRes = await pool.query('SELECT current_database(), current_schema()');
    console.log(`[PostgreSQL] Connected to DB '${pgRes.rows[0].current_database}' on schema '${pgRes.rows[0].current_schema}'`);

    // 2. Connect MongoDB (non-blocking, tolerant fallback)
    await connectMongo();

    // 3. Start listening
    const server = app.listen(env.port, () => {
      console.log(`===============================================`);
      console.log(`  EduWrap 2.0 Backend Server Running`);
      console.log(`  Port:    ${env.port}`);
      console.log(`  Env:     ${env.nodeEnv}`);
      console.log(`  Health:  http://localhost:${env.port}/health`);
      console.log(`  API:     http://localhost:${env.port}/api/status`);
      console.log(`===============================================`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        try {
          await pool.end();
          console.log('[PostgreSQL] Connection pool closed.');
          await closeMongo();
          console.log('[MongoDB] Connection closed.');
          console.log('[Server] Shutdown complete.');
          process.exit(0);
        } catch (err) {
          console.error('[Server] Error during shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
