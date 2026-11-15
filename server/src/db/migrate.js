/**
 * Applies server/src/db/schema.sql to the configured database.
 *
 * The schema is written to be idempotent (IF NOT EXISTS / CREATE OR REPLACE),
 * so running this repeatedly is safe and never destroys existing data.
 *
 * Usage: npm run migrate
 */
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('./index');

const schemaPath = path.join(__dirname, 'schema.sql');

async function migrate({ silent = false } = {}) {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    if (!silent) console.log('[migrate] schema applied successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] failed:', err.message);
      process.exit(1);
    });
}

module.exports = { migrate };
