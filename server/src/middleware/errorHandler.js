const config = require('../config');
const { ApiError } = require('../utils/errors');
const { slotWithArticle } = require('../utils/slots');

/**
 * Translates PostgreSQL errors into safe, user-facing API responses.
 *
 * The database is the final authority on integrity rules, so constraint
 * violations must still produce the exact messages the assignment requires
 * even if an application-level check were somehow bypassed (race condition,
 * future code path, direct SQL). Raw driver text is never forwarded.
 */
function mapDatabaseError(err) {
  // Unique violation
  if (err.code === '23505') {
    if (err.constraint === 'uq_users_email') {
      return ApiError.conflict('An account with this email already exists.');
    }

    if (err.constraint === 'uq_readings_user_date_slot') {
      // The slot value is available in the error detail; fall back to a
      // generic phrasing if it cannot be parsed.
      const match = /time_slot\)=\(([A-Z_]+)\)/.exec(err.detail || '');
      if (match) {
        return ApiError.conflict(
          `You already have ${slotWithArticle(match[1])} reading for this date.`
        );
      }
      return ApiError.conflict('You already have a reading for this date and time slot.');
    }

    return ApiError.conflict('This record already exists.');
  }

  // Check constraint violation
  if (err.code === '23514') {
    if (err.constraint === 'chk_readings_glucose_range') {
      return ApiError.badRequest('Value must be between 40 and 600 mg/dl.');
    }
    return ApiError.badRequest('The submitted data failed a database validation rule.');
  }

  // Custom SQLSTATE raised by the future-date trigger
  if (err.code === 'SW001') {
    return ApiError.badRequest('Date cannot be in the future.');
  }

  // Foreign key violation
  if (err.code === '23503') {
    return ApiError.badRequest('The referenced record does not exist.');
  }

  // Invalid enum value / invalid integer syntax
  if (err.code === '22P02' || err.code === '22007' || err.code === '22008') {
    return ApiError.badRequest('One or more fields contain an invalid value.');
  }

  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let apiError = err;

  if (!(err instanceof ApiError)) {
    const mapped = mapDatabaseError(err);
    if (mapped) {
      apiError = mapped;
    } else if (err.type === 'entity.parse.failed') {
      apiError = ApiError.badRequest('Request body must be valid JSON.');
    } else {
      // Unexpected failure: log the detail server-side, return something generic.
      console.error('[error]', err);
      apiError = new ApiError(500, 'Something went wrong on our end. Please try again.');
    }
  }

  const body = {
    success: false,
    message: apiError.message,
  };

  if (apiError.errors && apiError.errors.length > 0) {
    body.errors = apiError.errors;
  }

  if (config.env === 'development' && !apiError.isOperational) {
    body.stack = err.stack;
  }

  return res.status(apiError.statusCode || 500).json(body);
}

/** 404 for any route that did not match. */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
}

module.exports = { errorHandler, notFoundHandler, mapDatabaseError };
