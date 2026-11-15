const express = require('express');
const { daily, monthToDate, previousMonth } = require('../controllers/report.controller');
const { reportDateRule } = require('../validators/reading.validators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Every report route requires a valid token; results are always scoped to it.
router.use(authenticate);

router.get('/daily', reportDateRule, validate, daily);
router.get('/month-to-date', reportDateRule, validate, monthToDate);
router.get('/monthly', reportDateRule, validate, previousMonth);

module.exports = router;
