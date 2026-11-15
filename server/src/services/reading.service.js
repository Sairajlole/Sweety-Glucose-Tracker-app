const db = require('../db');
const { ApiError } = require('../utils/errors');
const { slotLabel, slotWithArticle } = require('../utils/slots');

const MAX_READINGS_PER_DAY = 4;

function toReading(row) {
  return {
    id: row.id,
    readingDate: row.reading_date,
    timeSlot: row.time_slot,
    timeSlotLabel: slotLabel(row.time_slot),
    glucoseValue: row.glucose_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Enforces the two per-day rules, in the required order.
 *
 * Order matters and is deliberate: the four permitted slots plus the unique
 * slot constraint make a "5th distinct reading" impossible, so the only way a
 * user can exceed four readings is by re-using a slot. Checking the daily
 * total first is what makes "You can add only 4 readings per day." reachable
 * and separately testable from the duplicate-slot message. With three or
 * fewer readings, re-using a slot correctly reports the duplicate instead.
 *
 * `excludeId` lets an update ignore the row being edited, so re-saving a
 * reading without changing its slot never reports a phantom duplicate.
 */
async function assertDailyRules({ userId, readingDate, timeSlot, excludeId = null }) {
  const countResult = await db.query(
    `SELECT COUNT(*)::int AS count
       FROM readings
      WHERE user_id = $1
        AND reading_date = $2
        AND ($3::int IS NULL OR id <> $3::int)`,
    [userId, readingDate, excludeId]
  );

  if (countResult.rows[0].count >= MAX_READINGS_PER_DAY) {
    throw ApiError.conflict('You can add only 4 readings per day.');
  }

  const duplicate = await db.query(
    `SELECT id
       FROM readings
      WHERE user_id = $1
        AND reading_date = $2
        AND time_slot = $3::time_slot
        AND ($4::int IS NULL OR id <> $4::int)`,
    [userId, readingDate, timeSlot, excludeId]
  );

  if (duplicate.rowCount > 0) {
    throw ApiError.conflict(
      `You already have ${slotWithArticle(timeSlot)} reading for this date.`
    );
  }
}

async function create(userId, { reading_date: readingDate, time_slot: timeSlot, glucose_value: glucoseValue }) {
  await assertDailyRules({ userId, readingDate, timeSlot });

  const result = await db.query(
    `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
     VALUES ($1, $2, $3::time_slot, $4)
     RETURNING id, reading_date, time_slot, glucose_value, created_at, updated_at`,
    [userId, readingDate, timeSlot, glucoseValue]
  );

  return toReading(result.rows[0]);
}

async function list(userId, { page = 1, limit = 20, from, to, timeSlot } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];

  if (from) {
    params.push(from);
    conditions.push(`reading_date >= $${params.length}::date`);
  }

  if (to) {
    params.push(to);
    conditions.push(`reading_date <= $${params.length}::date`);
  }

  if (timeSlot) {
    params.push(timeSlot);
    conditions.push(`time_slot = $${params.length}::time_slot`);
  }

  const where = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM readings WHERE ${where}`,
    params
  );
  const total = countResult.rows[0].total;

  const offset = (page - 1) * limit;
  const listParams = [...params, limit, offset];

  const result = await db.query(
    `SELECT id, reading_date, time_slot, glucose_value, created_at, updated_at
       FROM readings
      WHERE ${where}
      ORDER BY reading_date DESC, time_slot ASC, id DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    readings: result.rows.map(toReading),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/** Scoped by user_id so another patient's id resolves to "not found". */
async function getById(userId, id) {
  const result = await db.query(
    `SELECT id, reading_date, time_slot, glucose_value, created_at, updated_at
       FROM readings
      WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  const row = result.rows[0];
  if (!row) throw ApiError.notFound('Reading not found.');
  return toReading(row);
}

async function update(userId, id, { reading_date: readingDate, time_slot: timeSlot, glucose_value: glucoseValue }) {
  const existing = await getById(userId, id);

  await assertDailyRules({
    userId,
    readingDate,
    timeSlot,
    excludeId: existing.id,
  });

  const result = await db.query(
    `UPDATE readings
        SET reading_date = $1,
            time_slot = $2::time_slot,
            glucose_value = $3
      WHERE id = $4 AND user_id = $5
      RETURNING id, reading_date, time_slot, glucose_value, created_at, updated_at`,
    [readingDate, timeSlot, glucoseValue, id, userId]
  );

  if (result.rowCount === 0) throw ApiError.notFound('Reading not found.');
  return toReading(result.rows[0]);
}

async function remove(userId, id) {
  const result = await db.query(
    'DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );

  if (result.rowCount === 0) throw ApiError.notFound('Reading not found.');
  return { id };
}

module.exports = { create, list, getById, update, remove, toReading, MAX_READINGS_PER_DAY };
