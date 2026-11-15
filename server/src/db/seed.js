/**
 * Seeds the demo account and a realistic spread of readings.
 *
 * Safe to run repeatedly:
 *   - the demo user is upserted on email, so no duplicate account is created
 *   - readings are inserted with ON CONFLICT DO NOTHING against
 *     (user_id, reading_date, time_slot), so no duplicate readings appear
 *
 * Usage: npm run seed
 */
const bcrypt = require('bcryptjs');
const db = require('./index');
const config = require('../config');
const { toISODate } = require('../utils/dates');

const DEMO = {
  name: 'Sweety Demo',
  email: 'demo@sweety.app',
  password: 'SweetyDemo@123',
};

const SLOTS = ['MORNING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER'];

/** Deterministic PRNG so every seed run produces the same dataset. */
function createRandom(seed = 42) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Plausible glucose ranges per slot. Morning fasting runs lowest; post-meal
 * values peak higher. The widening tail occasionally produces an outlier so
 * the min/max report cards have something meaningful to show.
 */
const SLOT_RANGES = {
  MORNING: [88, 122],
  AFTER_BREAKFAST: [118, 172],
  AFTER_LUNCH: [112, 168],
  AFTER_DINNER: [120, 182],
};

function buildReadings(random, days = 24) {
  const readings = [];
  const today = new Date();

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset);
    const readingDate = toISODate(date);

    // Some days are deliberately sparse: 2 or 3 readings, and the odd fully
    // missed day, which is what a real patient's log looks like.
    const roll = random();
    if (roll < 0.08) continue; // missed day
    const slotsToday = roll < 0.28 ? SLOTS.slice(0, 2) : roll < 0.5 ? SLOTS.slice(0, 3) : SLOTS;

    for (const slot of slotsToday) {
      const [min, max] = SLOT_RANGES[slot];
      let value = Math.round(min + random() * (max - min));

      // Occasional outlier, still comfortably inside the 40-600 DB constraint.
      if (random() < 0.06) value += Math.round(28 + random() * 34);
      if (random() < 0.05) value -= Math.round(14 + random() * 16);

      readings.push({
        readingDate,
        slot,
        value: Math.min(600, Math.max(40, value)),
      });
    }
  }

  return readings;
}

async function seed() {
  const passwordHash = await bcrypt.hash(DEMO.password, config.bcryptRounds);

  const userResult = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
     RETURNING id, email`,
    [DEMO.name, DEMO.email, passwordHash]
  );

  const user = userResult.rows[0];
  console.log(`[seed] demo user ready: ${user.email} (id ${user.id})`);

  const random = createRandom(20260808);
  const readings = buildReadings(random);

  let inserted = 0;
  for (const reading of readings) {
    const result = await db.query(
      `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
       VALUES ($1, $2, $3::time_slot, $4)
       ON CONFLICT (user_id, reading_date, time_slot) DO NOTHING`,
      [user.id, reading.readingDate, reading.slot, reading.value]
    );
    inserted += result.rowCount;
  }

  const totals = await db.query(
    `SELECT COUNT(*)::int AS count,
            MIN(reading_date) AS first_date,
            MAX(reading_date) AS last_date
       FROM readings WHERE user_id = $1`,
    [user.id]
  );

  console.log(`[seed] readings prepared: ${readings.length}, newly inserted: ${inserted}`);
  console.log(
    `[seed] demo user now has ${totals.rows[0].count} readings ` +
      `(${totals.rows[0].first_date} to ${totals.rows[0].last_date})`
  );
  console.log(`[seed] login with ${DEMO.email} / ${DEMO.password}`);
}

if (require.main === module) {
  seed()
    .then(() => db.close())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] failed:', err.message);
      process.exit(1);
    });
}

module.exports = { seed, DEMO };
