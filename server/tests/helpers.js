import request from 'supertest';
import app from '../src/app';
import dbModule from '../src/db';
import migrateModule from '../src/db/migrate';

// The application itself is CommonJS, so pull the named helpers off the
// module.exports objects rather than relying on CJS named-export detection.
const { pool } = dbModule;
const { migrate } = migrateModule;

/** Apply the schema once per test file. */
export async function setupDatabase() {
  await migrate({ silent: true });
}

/** Remove all data so each test starts from a known state. */
export async function resetDatabase() {
  await pool.query('TRUNCATE readings, users RESTART IDENTITY CASCADE');
}

export async function closeDatabase() {
  await pool.end();
}

let counter = 0;

/** Register a user and return their token. */
export async function registerUser(overrides = {}) {
  counter += 1;
  const payload = {
    name: 'Test Patient',
    email: `patient${counter}_${Date.now()}@example.com`,
    password: 'SweetyPass123',
    ...overrides,
  };

  const response = await request(app).post('/api/auth/register').send(payload);

  return {
    response,
    token: response.body?.data?.token,
    user: response.body?.data?.user,
    email: payload.email,
    password: payload.password,
  };
}

/** Supertest request with the bearer token already attached. */
export function withAuth(testRequest, token) {
  return testRequest.set('Authorization', `Bearer ${token}`);
}

/** Local-time 'YYYY-MM-DD' for a date offset from today. */
export function isoDaysAgo(offset) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Create a reading for a user, returning the API response. */
export function createReading(token, body) {
  return withAuth(request(app).post('/api/readings'), token).send(body);
}

export { app, request, pool };
