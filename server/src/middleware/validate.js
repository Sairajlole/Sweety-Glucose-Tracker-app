const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/errors');

/**
 * Collapses express-validator results into a single 400 response using the
 * project-wide error envelope: { success, message, errors[] }.
 */
function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  return next(ApiError.badRequest(errors[0].message, errors));
}

module.exports = { validate };
