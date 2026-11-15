/**
 * Calendar-date helpers.
 *
 * Reading dates are calendar days, so everything here works on the local
 * 'YYYY-MM-DD' representation and never on UTC instants. Using
 * toISOString() directly would roll the date backwards for users east of
 * UTC during the early hours of the day.
 */

const pad = (n) => String(n).padStart(2, '0');

/** Format a Date as a local-time 'YYYY-MM-DD' string. */
function toISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's date in the server's local timezone, 'YYYY-MM-DD'. */
const todayISO = () => toISODate(new Date());

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when the string is a real calendar date in 'YYYY-MM-DD' form. */
function isValidISODate(value) {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  // Round-trip through Date so 2025-02-30 and 2025-13-01 are rejected.
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** True when the given 'YYYY-MM-DD' string is after today. */
function isFutureDate(value) {
  return value > todayISO();
}

/**
 * Inclusive month boundaries for a 'YYYY-MM-DD' date.
 * Handles month lengths and year rollover via Date arithmetic.
 */
function monthBounds(isoDate) {
  const [year, month] = isoDate.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // day 0 = last day of previous month
  return { start: toISODateUTC(start), end: toISODateUTC(end) };
}

function toISODateUTC(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Human label like "October 2026" for a 'YYYY-MM-DD' date. */
function monthLabel(isoDate) {
  const [year, month] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Human label like "15 Oct 2026" for a 'YYYY-MM-DD' date. */
function dateLabel(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

module.exports = {
  toISODate,
  todayISO,
  isValidISODate,
  isFutureDate,
  monthBounds,
  monthLabel,
  dateLabel,
};
