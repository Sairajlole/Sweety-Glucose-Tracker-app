import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import jwtLib from 'jsonwebtoken';
import dbModule from '../src/db';
import {
  app,
  request,
  setupDatabase,
  resetDatabase,
  closeDatabase,
  registerUser,
  withAuth,
} from './helpers';

const { pool } = dbModule;

beforeAll(setupDatabase);
beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('POST /api/auth/register', () => {
  it('creates an account and returns a token', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Sweety Sharma',
      email: 'sweety@example.com',
      password: 'SweetyPass123',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTypeOf('string');
    expect(response.body.data.user).toMatchObject({
      name: 'Sweety Sharma',
      email: 'sweety@example.com',
    });
    expect(response.body.data.user.id).toBeTypeOf('number');
  });

  it('never exposes the password hash', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Hash Check',
      email: 'hash@example.com',
      password: 'SweetyPass123',
    });

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain('password_hash');
    expect(serialised).not.toContain('passwordHash');
    expect(serialised).not.toContain('SweetyPass123');
  });

  it('stores the password as a bcrypt hash, not plaintext', async () => {
    const { user } = await registerUser({ email: 'bcrypt@example.com' });

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    const hash = result.rows[0].password_hash;

    expect(hash).not.toBe('SweetyPass123');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('rejects a duplicate email address', async () => {
    const { email } = await registerUser({ email: 'duplicate@example.com' });

    const response = await request(app).post('/api/auth/register').send({
      name: 'Someone Else',
      email,
      password: 'AnotherPass123',
    });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('An account with this email already exists.');
  });

  it('treats email as case-insensitive for duplicates', async () => {
    await registerUser({ email: 'Case@Test.com' });

    const response = await request(app).post('/api/auth/register').send({
      name: 'Case Test',
      email: 'case@test.com',
      password: 'SweetyPass123',
    });

    expect(response.status).toBe(409);
  });

  it('rejects an invalid email format', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'SweetyPass123',
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].field).toBe('email');
  });

  it('rejects a missing name', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'noname@example.com', password: 'SweetyPass123' });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].field).toBe('name');
  });

  it('rejects a short password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short Pass', email: 'short@example.com', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].field).toBe('password');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    const { email, password } = await registerUser();

    const response = await request(app).post('/api/auth/login').send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeTypeOf('string');
    expect(response.body.data.user.email).toBe(email);
  });

  it('rejects an incorrect password', async () => {
    const { email } = await registerUser();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword123' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password.');
  });

  it('rejects an unknown email with the same message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'SweetyPass123' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password.');
  });

  it('rejects a missing password', async () => {
    const { email } = await registerUser();

    const response = await request(app).post('/api/auth/login').send({ email });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].field).toBe('password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const { token, user } = await registerUser();

    const response = await withAuth(request(app).get('/api/auth/me'), token);

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(user.id);
    expect(response.body.data.user.email).toBe(user.email);
  });

  it('rejects a request without a token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects a malformed token', async () => {
    const response = await withAuth(request(app).get('/api/auth/me'), 'not-a-real-token');

    expect(response.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwtLib.sign({ sub: '1' }, 'totally-wrong-secret');

    const response = await withAuth(request(app).get('/api/auth/me'), forged);

    expect(response.status).toBe(401);
  });
});

describe('protected resources', () => {
  it('rejects reading access without a token', async () => {
    const response = await request(app).get('/api/readings');
    expect(response.status).toBe(401);
  });

  it('rejects report access without a token', async () => {
    const response = await request(app).get('/api/reports/daily?date=2026-01-01');
    expect(response.status).toBe(401);
  });
});
