const db = require('../db');
const { slotLabel } = require('../utils/slots');

/**
 * Report calculations.
 *
 * Every aggregate is computed by PostgreSQL over rows filtered by the
 * authenticated user id - there is no sample data and no frontend maths.
 *
 * Period boundaries are derived with SQL date_trunc/interval arithmetic rather
 * than JavaScript date maths, so 28/29/30/31-day months and December->January
 * year transitions are handled by the database itself.
 */

const EMPTY_SUMMARY = {
  highest: null,
  lowest: null,
  average: null,
  totalReadings: 0,
};

async function aggregate(userId, from, to) {
  const result = await db.query(
    `SELECT COUNT(*)::int                              AS total,
            MIN(glucose_value)::int                    AS lowest,
            MAX(glucose_value)::int                    AS highest,
            ROUND(AVG(glucose_value)::numeric, 1)      AS average
       FROM readings
      WHERE user_id = $1
        AND reading_date >= $2::date
        AND reading_date <= $3::date`,
    [userId, from, to]
  );

  const row = result.rows[0];

  if (!row || row.total === 0) {
    return { ...EMPTY_SUMMARY };
  }

  return {
    // ROUND(AVG(...)::numeric, 1) -> one decimal place, as required.
    highest: row.highest,
    lowest: row.lowest,
    average: row.average === null ? null : Number(row.average),
    totalReadings: row.total,
  };
}

async function resolvePeriods(date) {
  const result = await db.query(
    `SELECT date_trunc('month', $1::date)::date                      AS mtd_start,
            $1::date                                                 AS mtd_end,
            (date_trunc('month', $1::date) - interval '1 month')::date AS prev_start,
            (date_trunc('month', $1::date) - interval '1 day')::date   AS prev_end`,
    [date]
  );
  return result.rows[0];
}

function formatMonth(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Highest / lowest / average / count for a single date, plus every reading. */
async function dailyReport(userId, date) {
  const summary = await aggregate(userId, date, date);

  const result = await db.query(
    `SELECT id, reading_date, time_slot, glucose_value
       FROM readings
      WHERE user_id = $1 AND reading_date = $2::date
      ORDER BY time_slot ASC`,
    [userId, date]
  );

  return {
    type: 'daily',
    date,
    period: { from: date, to: date, label: date },
    summary,
    hasData: summary.totalReadings > 0,
    readings: result.rows.map((row) => ({
      id: row.id,
      readingDate: row.reading_date,
      timeSlot: row.time_slot,
      timeSlotLabel: slotLabel(row.time_slot),
      glucoseValue: row.glucose_value,
    })),
  };
}

/** First day of the selected month through the selected date. */
async function monthToDateReport(userId, date) {
  const periods = await resolvePeriods(date);
  const from = periods.mtd_start;
  const to = periods.mtd_end;
  const summary = await aggregate(userId, from, to);

  return {
    type: 'month-to-date',
    date,
    period: { from, to, label: `1 ${formatMonth(date)} - ${date}` },
    summary,
    hasData: summary.totalReadings > 0,
  };
}

/** First day through last day of the previous calendar month. */
async function previousMonthReport(userId, date) {
  const periods = await resolvePeriods(date);
  const from = periods.prev_start;
  const to = periods.prev_end;
  const summary = await aggregate(userId, from, to);

  return {
    type: 'previous-month',
    date,
    period: { from, to, label: formatMonth(from) },
    summary,
    hasData: summary.totalReadings > 0,
  };
}

module.exports = {
  aggregate,
  dailyReport,
  monthToDateReport,
  previousMonthReport,
  EMPTY_SUMMARY,
};
