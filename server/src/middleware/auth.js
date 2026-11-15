const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../utils/errors');

/**
 * Verifies the Bearer token and attaches the authenticated user to req.user.
 *
 * The user id used by every downstream query comes from this verified token
 * only. A user_id supplied in the request body or query string is never
 * trusted, which is what keeps one patient's readings invisible to another.
 */
function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication token is required.'));
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(ApiError.unauthorized('Authentication token is required.'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);

    if (!payload || !payload.sub) {
      return next(ApiError.unauthorized('Invalid authentication token.'));
    }

    req.user = { id: Number(payload.sub) };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Your session has expired. Please log in again.'));
    }
    return next(ApiError.unauthorized('Invalid authentication token.'));
  }
}

module.exports = { authenticate };
