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

const VALID = {
  readingDate: isoDaysAgo(1),
  timeSlot: 'MORNING',
  glucoseValue: 110,
};

describe('POST /api/readings - creation', () => {
  it('creates a reading', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, VALID);

    expect(response.status).toBe(201);
    expect(response.body.data.reading).toMatchObject({
      readingDate: VALID.readingDate,
      timeSlot: 'MORNING',
      timeSlotLabel: 'Morning (Fasting)',
      glucoseValue: 110,
    });
  });

  it('accepts the boundary values 40 and 600', async () => {
    const { token } = await registerUser();

    const low = await createReading(token, {
      readingDate: isoDaysAgo(2),
      timeSlot: 'MORNING',
      glucoseValue: 40,
    });
    const high = await createReading(token, {
      readingDate: isoDaysAgo(2),
      timeSlot: 'AFTER_LUNCH',
      glucoseValue: 600,
    });

    expect(low.status).toBe(201);
    expect(high.status).toBe(201);
  });

  it('requires a valid token', async () => {
    const response = await request(app).post('/api/readings').send(VALID);
    expect(response.status).toBe(401);
  });
});

describe('POST /api/readings - validation rules', () => {
  it('rule 1: requires a glucose value', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, {
      readingDate: isoDaysAgo(1),
      timeSlot: 'MORNING',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Please enter a glucose value.');
  });

  it('rule 1: treats an empty string as missing', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, {
      readingDate: isoDaysAgo(1),
      timeSlot: 'MORNING',
      glucoseValue: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Please enter a glucose value.');
  });

  it('rule 2: rejects a value below 40', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, { ...VALID, glucoseValue: 39 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rule 2: rejects a value above 600', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, { ...VALID, glucoseValue: 601 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rule 2: rejects a decimal value', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, { ...VALID, glucoseValue: 97.5 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rule 2: rejects non-numeric input', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, { ...VALID, glucoseValue: 'abc' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rule 3: rejects a duplicate slot on the same date', async () => {
    const { token } = await registerUser();
    await createReading(token, VALID);

    const response = await createReading(token, { ...VALID, glucoseValue: 150 });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      'You already have a Morning (Fasting) reading for this date.'
    );
  });

  it('rule 3: uses the correct article for After meals', async () => {
    const { token } = await registerUser();
    await createReading(token, { ...VALID, timeSlot: 'AFTER_LUNCH' });

    const response = await createReading(token, { ...VALID, timeSlot: 'AFTER_LUNCH' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('You already have an After Lunch reading for this date.');
  });

  it('rule 3: allows the same slot on a different date', async () => {
    const { token } = await registerUser();
    await createReading(token, VALID);

    const response = await createReading(token, { ...VALID, readingDate: isoDaysAgo(2) });

    expect(response.status).toBe(201);
  });

  it('rule 4: allows four readings in one day', async () => {
    const { token } = await registerUser();
    const date = isoDaysAgo(4);

    for (const slot of ['MORNING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER']) {
      const response = await createReading(token, {
        readingDate: date,
        timeSlot: slot,
        glucoseValue: 120,
      });
      expect(response.status).toBe(201);
    }
  });

  it('rule 4: rejects a fifth reading in one day', async () => {
    const { token } = await registerUser();
    const date = isoDaysAgo(4);

    for (const slot of ['MORNING', 'AFTER_BREAKFAST', 'AFTER_LUNCH', 'AFTER_DINNER']) {
      await createReading(token, { readingDate: date, timeSlot: slot, glucoseValue: 120 });
    }

    const response = await createReading(token, {
      readingDate: date,
      timeSlot: 'MORNING',
      glucoseValue: 130,
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('You can add only 4 readings per day.');
  });

  it('rule 5: rejects a future date', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, {
      ...VALID,
      readingDate: isoDaysAgo(-1),
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Date cannot be in the future.');
  });

  it('rule 5: accepts today', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, { ...VALID, readingDate: isoDaysAgo(0) });

    expect(response.status).toBe(201);
  });

  it('rejects an invalid time slot', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, { ...VALID, timeSlot: 'MIDNIGHT' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Please select a valid time slot.');
  });

  it('rejects a malformed date', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, { ...VALID, readingDate: '15-11-2026' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Please enter a valid date in YYYY-MM-DD format.');
  });

  it('rejects an impossible calendar date', async () => {
    const { token } = await registerUser();

    const response = await createReading(token, { ...VALID, readingDate: '2026-02-30' });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/readings', () => {
  it('lists only the authenticated user readings', async () => {
    const owner = await registerUser();
    const other = await registerUser();

    await createReading(owner.token, VALID);
    await createReading(other.token, { ...VALID, glucoseValue: 190 });

    const response = await withAuth(request(app).get('/api/readings'), owner.token);

    expect(response.status).toBe(200);
    expect(response.body.data.readings).toHaveLength(1);
    expect(response.body.data.readings[0].glucoseValue).toBe(110);
  });

  it('returns pagination metadata', async () => {
    const { token } = await registerUser();

    for (let day = 1; day <= 5; day += 1) {
      await createReading(token, { ...VALID, readingDate: isoDaysAgo(day) });
    }

    const response = await withAuth(
      request(app).get('/api/readings?page=2&limit=2'),
      token
    );

    expect(response.status).toBe(200);
    expect(response.body.data.readings).toHaveLength(2);
    expect(response.body.data.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it('filters by date range', async () => {
    const { token } = await registerUser();

    await createReading(token, { ...VALID, readingDate: isoDaysAgo(10) });
    await createReading(token, { ...VALID, readingDate: isoDaysAgo(2) });

    const response = await withAuth(
      request(app).get(`/api/readings?from=${isoDaysAgo(3)}&to=${isoDaysAgo(1)}`),
      token
    );

    expect(response.body.data.readings).toHaveLength(1);
    expect(response.body.data.readings[0].readingDate).toBe(isoDaysAgo(2));
  });

  it('rejects an out-of-range limit', async () => {
    const { token } = await registerUser();
    const response = await withAuth(request(app).get('/api/readings?limit=1000'), token);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/readings/:id', () => {
  it('returns a reading owned by the caller', async () => {
    const { token } = await registerUser();
    const created = await createReading(token, VALID);
    const id = created.body.data.reading.id;

    const response = await withAuth(request(app).get(`/api/readings/${id}`), token);

    expect(response.status).toBe(200);
    expect(response.body.data.reading.id).toBe(id);
  });

  it("returns 404 for another user's reading", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const created = await createReading(owner.token, VALID);

    const response = await withAuth(
      request(app).get(`/api/readings/${created.body.data.reading.id}`),
      other.token
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Reading not found.');
  });

  it('returns 404 for a reading that does not exist', async () => {
    const { token } = await registerUser();
    const response = await withAuth(request(app).get('/api/readings/99999'), token);
    expect(response.status).toBe(404);
  });

  it('returns 400 for a non-numeric id', async () => {
    const { token } = await registerUser();
    const response = await withAuth(request(app).get('/api/readings/abc'), token);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid reading id.');
  });
});

describe('PUT /api/readings/:id', () => {
  it('updates a reading', async () => {
    const { token } = await registerUser();
    const created = await createReading(token, VALID);
    const id = created.body.data.reading.id;

    const response = await withAuth(request(app).put(`/api/readings/${id}`), token).send({
      readingDate: isoDaysAgo(2),
      timeSlot: 'AFTER_BREAKFAST',
      glucoseValue: 165,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.reading).toMatchObject({
      readingDate: isoDaysAgo(2),
      timeSlot: 'AFTER_BREAKFAST',
      glucoseValue: 165,
    });
  });

  it('allows re-saving the same slot without a false duplicate', async () => {
    const { token } = await registerUser();
    const created = await createReading(token, VALID);
    const id = created.body.data.reading.id;

    const response = await withAuth(request(app).put(`/api/readings/${id}`), token).send({
      readingDate: VALID.readingDate,
      timeSlot: VALID.timeSlot,
      glucoseValue: 130,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.reading.glucoseValue).toBe(130);
  });

  it('rejects moving a reading onto a slot already used that day', async () => {
    const { token } = await registerUser();
    await createReading(token, VALID);
    const second = await createReading(token, { ...VALID, timeSlot: 'AFTER_DINNER' });

    const response = await withAuth(
      request(app).put(`/api/readings/${second.body.data.reading.id}`),
      token
    ).send({
      readingDate: VALID.readingDate,
      timeSlot: 'MORNING',
      glucoseValue: 140,
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      'You already have a Morning (Fasting) reading for this date.'
    );
  });

  it('applies the same validation rules on update', async () => {
    const { token } = await registerUser();
    const created = await createReading(token, VALID);

    const response = await withAuth(
      request(app).put(`/api/readings/${created.body.data.reading.id}`),
      token
    ).send({ readingDate: VALID.readingDate, timeSlot: 'MORNING', glucoseValue: 900 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it("returns 404 when updating another user's reading", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const created = await createReading(owner.token, VALID);

    const response = await withAuth(
      request(app).put(`/api/readings/${created.body.data.reading.id}`),
      other.token
    ).send({ readingDate: VALID.readingDate, timeSlot: 'MORNING', glucoseValue: 100 });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/readings/:id', () => {
  it('deletes a reading', async () => {
    const { token } = await registerUser();
    const created = await createReading(token, VALID);
    const id = created.body.data.reading.id;

    const response = await withAuth(request(app).delete(`/api/readings/${id}`), token);
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(id);

    const after = await withAuth(request(app).get(`/api/readings/${id}`), token);
    expect(after.status).toBe(404);
  });

  it("returns 404 when deleting another user's reading", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const created = await createReading(owner.token, VALID);

    const response = await withAuth(
      request(app).delete(`/api/readings/${created.body.data.reading.id}`),
      other.token
    );

    expect(response.status).toBe(404);

    // The owner's reading must still exist.
    const stillThere = await withAuth(
      request(app).get(`/api/readings/${created.body.data.reading.id}`),
      owner.token
    );
    expect(stillThere.status).toBe(200);
  });

  it('returns 404 for an unknown reading', async () => {
    const { token } = await registerUser();
    const response = await withAuth(request(app).delete('/api/readings/99999'), token);
    expect(response.status).toBe(404);
  });
});

describe('user_id supplied by the client', () => {
  it('is ignored in favour of the token', async () => {
    const owner = await registerUser();
    const attacker = await registerUser();

    // The attacker tries to plant a reading in the owner's account.
    const response = await withAuth(request(app).post('/api/readings'), attacker.token).send({
      ...VALID,
      user_id: owner.user.id,
    });

    expect(response.status).toBe(201);

    const ownerList = await withAuth(request(app).get('/api/readings'), owner.token);
    expect(ownerList.body.data.readings).toHaveLength(0);

    const attackerList = await withAuth(request(app).get('/api/readings'), attacker.token);
    expect(attackerList.body.data.readings).toHaveLength(1);
  });
});
