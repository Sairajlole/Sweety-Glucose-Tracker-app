const { Pool, types } = require('pg');
const config = require('../config');

// ---------------------------------------------------------------------------
// Type parsers
//
// By default node-postgres turns DATE columns into a JS Date at local midnight,
// which shifts across timezones and silently changes the calendar day. Glucose
// readings are calendar-day data, not instants, so we keep them as the raw
// 'YYYY-MM-DD' string PostgreSQL produced.
// ---------------------------------------------------------------------------
types.setTypeParser(types.builtins.DATE, (value) => value);

// AVG() returns NUMERIC, which node-postgres surfaces as a string ("118.3").
// Reports need real numbers so the API emits JSON numbers, not quoted values.
types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value));

const connectionString =
  process.env.NODE_ENV === 'test' && config.testDatabaseUrl
    ? config.testDatabaseUrl
    : config.databaseUrl;

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[db] unexpected idle client error:', err.message);
});

/** Run a query and return the full result. */
const query = (text, params) => pool.query(text, params);

/** Run a query and return only the rows. */
const rows = async (text, params) => (await pool.query(text, params)).rows;

/** Run a set of statements inside a transaction. */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const close = () => pool.end();

module.exports = { pool, query, rows, transaction, close };
