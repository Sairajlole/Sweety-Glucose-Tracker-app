const app = require('./app');
const config = require('./config');
const db = require('./db');

async function start() {
  try {
    // Fail fast with a clear message rather than on the first request.
    const result = await db.query('SELECT NOW() AS now');
    console.log(`[db] connected (${result.rows[0].now.toISOString()})`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    console.error('[db] is PostgreSQL running and is DATABASE_URL correct?');
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`[api] Sweety server listening on http://localhost:${config.port}`);
    console.log(`[api] environment: ${config.env}`);
  });

  const shutdown = (signal) => async () => {
    console.log(`\n[api] ${signal} received, shutting down.`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
}

start();
