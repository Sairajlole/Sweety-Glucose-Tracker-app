import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  app,
  request,
  setupDatabase,
  resetDatabase,
  closeDatabase,
  registerUser,
  withAuth,
  isoDaysAgo,
  createReading,
} from './helpers';

beforeAll(setupDatabase);
beforeEach(resetDatabase);
afterAll(closeDatabase);

const pad = (n) => String(n).padStart(2, '0');
const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

const getReport = (path, date, token) =>
  withAuth(request(app).get(`/api/reports/${path}?date=${date}`), token);

describe('GET /api/reports/daily', () => {
  it('calculates highest, lowest, average and count', async () => {
    const { token } = await registerUser();
    const date = isoDaysAgo(3);

    await createReading(token, { readingDate: date, timeSlot: 'MORNING', glucoseValue: 100 });
    await createReading(token, {
      readingDate: date,
      timeSlot: 'AFTER_BREAKFAST',
      glucoseValue: 110,
    });
    await createReading(token, { readingDate: date, timeSlot: 'AFTER_LUNCH', glucoseValue: 125 });

    const response = await getReport('daily', date, token);

    expect(response.status).toBe(200);
    const report = response.body.data.report;

    expect(report.hasData).toBe(true);
    expect(report.summary.highest).toBe(125);
    expect(report.summary.lowest).toBe(100);
    // 335 / 3 = 111.666... rounded to one decimal place
    expect(report.summary.average).toBe(111.7);
    expect(report.summary.totalReadings).toBe(3);
  });

  it('lists the individual readings in slot order', async () => {
    const { token } = await registerUser();
    const date = isoDaysAgo(3);

    await createReading(token, { readingDate: date, timeSlot: 'AFTER_DINNER', glucoseValue: 140 });
    await createReading(token, { readingDate: date, timeSlot: 'MORNING', glucoseValue: 90 });

    const response = await getReport('daily', date, token);
    const slots = response.body.data.report.readings.map((reading) => reading.timeSlot);

    expect(slots).toEqual(['MORNING', 'AFTER_DINNER']);
  });

  it('returns an empty report for a day with no readings', async () => {
    const { token } = await registerUser();

    const response = await getReport('daily', isoDaysAgo(20), token);
    const report = response.body.data.report;

    expect(response.status).toBe(200);
    expect(report.hasData).toBe(false);
    expect(report.summary).toEqual({
      highest: null,
      lowest: null,
      average: null,
      totalReadings: 0,
    });
    expect(report.readings).toEqual([]);
  });
});

describe('GET /api/reports/month-to-date', () => {
  it('covers the 1st of the month through the selected date', async () => {
    const { token } = await registerUser();
    const today = isoDaysAgo(0);

    // A reading before the current month must not be included.
    const beforeMonth = new Date(monthStart);
    beforeMonth.setDate(beforeMonth.getDate() - 1);
    await createReading(token, {
      readingDate: iso(beforeMonth),
      timeSlot: 'MORNING',
      glucoseValue: 300,
    });

    const values = [100, 140, 160];
    await createReading(token, {
      readingDate: iso(monthStart),
      timeSlot: 'MORNING',
      glucoseValue: values[0],
    });

    const expectedCount = iso(monthStart) === today ? 1 : 3;
    if (iso(monthStart) !== today) {
      await createReading(token, {
        readingDate: today,
        timeSlot: 'MORNING',
        glucoseValue: values[1],
      });
      await createReading(token, {
        readingDate: today,
        timeSlot: 'AFTER_LUNCH',
        glucoseValue: values[2],
      });
    }

    const usedValues = values.slice(0, expectedCount);
    const response = await getReport('month-to-date', today, token);
    const report = response.body.data.report;

    expect(response.status).toBe(200);
    expect(report.period.from).toBe(iso(monthStart));
    expect(report.period.to).toBe(today);
    expect(report.summary.totalReadings).toBe(expectedCount);
    expect(report.summary.highest).toBe(Math.max(...usedValues));
    expect(report.summary.lowest).toBe(Math.min(...usedValues));
    expect(report.summary.average).toBe(
      Number((usedValues.reduce((a, b) => a + b, 0) / usedValues.length).toFixed(1))
    );
  });

  it('excludes readings after the selected date', async () => {
    const { token } = await registerUser();
    const today = isoDaysAgo(0);

    if (iso(monthStart) === today) {
      // Nothing earlier in the month to compare against.
      return;
    }

    await createReading(token, {
      readingDate: today,
      timeSlot: 'MORNING',
      glucoseValue: 111,
    });

    const response = await getReport('month-to-date', isoDaysAgo(1), token);
    expect(response.body.data.report.summary.totalReadings).toBe(0);
  });
});

describe('GET /api/reports/monthly (previous calendar month)', () => {
  it('covers the full previous month and calculates the summary', async () => {
    const { token } = await registerUser();
    const today = isoDaysAgo(0);

    await createReading(token, {
      readingDate: iso(previousMonthStart),
      timeSlot: 'MORNING',
      glucoseValue: 90,
    });
    await createReading(token, {
      readingDate: iso(previousMonthStart),
      timeSlot: 'AFTER_LUNCH',
      glucoseValue: 180,
    });
    await createReading(token, {
      readingDate: iso(previousMonthEnd),
      timeSlot: 'AFTER_DINNER',
      glucoseValue: 120,
    });

    const response = await getReport('monthly', today, token);
    const report = response.body.data.report;

    expect(response.status).toBe(200);
    expect(report.period.from).toBe(iso(previousMonthStart));
    expect(report.period.to).toBe(iso(previousMonthEnd));
    expect(report.summary.highest).toBe(180);
    expect(report.summary.lowest).toBe(90);
    expect(report.summary.average).toBe(130);
    expect(report.summary.totalReadings).toBe(3);
  });

  it('handles February in a leap year (29 days)', async () => {
    const { token } = await registerUser();

    const response = await getReport('monthly', '2024-03-15', token);
    const report = response.body.data.report;

    expect(response.status).toBe(200);
    expect(report.period.from).toBe('2024-02-01');
    expect(report.period.to).toBe('2024-02-29');
  });

  it('handles February in a non-leap year (28 days)', async () => {
    const { token } = await registerUser();

    const response = await getReport('monthly', '2026-03-15', token);
    expect(response.body.data.report.period.to).toBe('2026-02-28');
  });

  it('handles the January to December year transition', async () => {
    const { token } = await registerUser();
    const year = now.getFullYear() - 1;

    const response = await getReport('monthly', `${year}-01-15`, token);
    const report = response.body.data.report;

    expect(report.period.from).toBe(`${year - 1}-12-01`);
    expect(report.period.to).toBe(`${year - 1}-12-31`);
  });

  it('returns an empty report when the previous month has no readings', async () => {
    const { token } = await registerUser();

    const response = await getReport('monthly', isoDaysAgo(0), token);
    const report = response.body.data.report;

    expect(report.hasData).toBe(false);
    expect(report.summary.highest).toBeNull();
    expect(report.summary.average).toBeNull();
    expect(report.summary.totalReadings).toBe(0);
  });
});

describe('report isolation between users', () => {
  it("never includes another user's readings", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const date = isoDaysAgo(2);

    await createReading(owner.token, {
      readingDate: date,
      timeSlot: 'MORNING',
      glucoseValue: 250,
    });

    for (const path of ['daily', 'month-to-date', 'monthly']) {
      const response = await getReport(path, date, other.token);
      expect(response.status).toBe(200);
      expect(response.body.data.report.summary.totalReadings).toBe(0);
      expect(response.body.data.report.hasData).toBe(false);
    }
  });
});

describe('report parameter validation', () => {
  it('requires a date parameter', async () => {
    const { token } = await registerUser();

    const response = await withAuth(request(app).get('/api/reports/daily'), token);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Please select a date.');
  });

  it('rejects a malformed date', async () => {
    const { token } = await registerUser();

    const response = await getReport('daily', '15-11-2026', token);
    expect(response.status).toBe(400);
  });

  it('rejects a future date', async () => {
    const { token } = await registerUser();

    const response = await getReport('daily', isoDaysAgo(-3), token);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Date cannot be in the future.');
  });
});
