const { body, param, query } = require('express-validator');
const { SLOT_VALUES } = require('../utils/slots');
const { isValidISODate, isFutureDate } = require('../utils/dates');

const MSG = {
  glucoseRequired: 'Please enter a glucose value.',
  glucoseRange: 'Value must be between 40 and 600 mg/dl.',
  dateRequired: 'Please select a date.',
  dateInvalid: 'Please enter a valid date in YYYY-MM-DD format.',
  dateFuture: 'Date cannot be in the future.',
  slotRequired: 'Please select a time slot.',
  slotInvalid: 'Please select a valid time slot.',
  idInvalid: 'Invalid reading id.',
};

/**
 * Glucose value: whole number between 40 and 600 inclusive.
 *
 * The first check distinguishes "missing" from "out of range" so the two
 * required messages stay unambiguous. The second check uses a digit-only
 * regex, which rejects decimals ("97.5"), exponents and hex forms that
 * Number() would otherwise happily coerce.
 */
const glucoseValueRule = body('glucoseValue')
  .custom((value) => {
    const isBlank =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '');
    if (isBlank) throw new Error(MSG.glucoseRequired);
    return true;
  })
  .bail()
  .custom((value) => {
    const raw = String(value).trim();
    if (!/^\d+$/.test(raw)) throw new Error(MSG.glucoseRange);
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 40 || parsed > 600) {
      throw new Error(MSG.glucoseRange);
    }
    return true;
  })
  .bail()
  .toInt();

const readingDateRule = body('readingDate')
  .custom((value) => {
    if (!value) throw new Error(MSG.dateRequired);
    if (!isValidISODate(String(value))) throw new Error(MSG.dateInvalid);
    return true;
  })
  .bail()
  .custom((value) => {
    if (isFutureDate(String(value))) throw new Error(MSG.dateFuture);
    return true;
  });

const timeSlotRule = body('timeSlot')
  .notEmpty()
  .withMessage(MSG.slotRequired)
  .bail()
  .isIn(SLOT_VALUES)
  .withMessage(MSG.slotInvalid);

const createReadingRules = [readingDateRule, timeSlotRule, glucoseValueRule];

const updateReadingRules = [...createReadingRules];

const readingIdRule = param('id')
  .isInt({ min: 1 })
  .withMessage(MSG.idInvalid)
  .toInt();

const listReadingsRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200.')
    .toInt(),
  query('from')
    .optional()
    .custom((v) => isValidISODate(String(v)))
    .withMessage('The "from" date must be in YYYY-MM-DD format.'),
  query('to')
    .optional()
    .custom((v) => isValidISODate(String(v)))
    .withMessage('The "to" date must be in YYYY-MM-DD format.'),
  query('timeSlot')
    .optional()
    .isIn(SLOT_VALUES)
    .withMessage('Please select a valid time slot.'),
];

const reportDateRule = [
  query('date')
    .custom((value) => {
      if (!value) throw new Error(MSG.dateRequired);
      if (!isValidISODate(String(value))) throw new Error(MSG.dateInvalid);
      return true;
    })
    .bail()
    .custom((value) => {
      if (isFutureDate(String(value))) throw new Error(MSG.dateFuture);
      return true;
    }),
];

module.exports = {
  MSG,
  createReadingRules,
  updateReadingRules,
  readingIdRule,
  listReadingsRules,
  reportDateRule,
};
