const { body } = require('express-validator');

const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Please enter your full name.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Please enter your email address.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .isLength({ max: 255 })
    .withMessage('Email address is too long.')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password')
    .notEmpty()
    .withMessage('Please enter a password.')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters long.'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Please enter your email address.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password').notEmpty().withMessage('Please enter your password.'),
];

module.exports = { registerRules, loginRules };
