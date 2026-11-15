const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { ApiError } = require('../utils/errors');

/** Shape a users row for the API - password_hash never leaves this module. */
function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

function signToken(user) {
  return jwt.sign({ sub: String(user.id) }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

async function findByEmail(email) {
  const result = await db.query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE lower(email) = lower($1)',
    [email]
  );
  return result.rows[0] || null;
}

async function register({ name, email, password }) {
  const existing = await findByEmail(email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  const result = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name.trim(), email.toLowerCase(), passwordHash]
  );

  const user = result.rows[0];
  return { user: toPublicUser(user), token: signToken(user) };
}

async function login({ email, password }) {
  const user = await findByEmail(email);

  // Same message and comparable timing for "no such user" and "wrong password"
  // so the endpoint cannot be used to enumerate registered accounts.
  const hash = user ? user.password_hash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const matches = await bcrypt.compare(password, hash);

  if (!user || !matches) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  return { user: toPublicUser(user), token: signToken(user) };
}

async function getById(id) {
  const result = await db.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [id]
  );

  const user = result.rows[0];
  if (!user) throw ApiError.unauthorized('Account no longer exists.');
  return toPublicUser(user);
}

module.exports = { register, login, getById, toPublicUser };
