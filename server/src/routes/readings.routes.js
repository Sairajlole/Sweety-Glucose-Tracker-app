const express = require('express');
const {
  create,
  list,
  getOne,
  update,
  remove,
} = require('../controllers/reading.controller');
const {
  createReadingRules,
  updateReadingRules,
  readingIdRule,
  listReadingsRules,
} = require('../validators/reading.validators');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Every reading route requires a valid token.
router.use(authenticate);

router.route('/').post(createReadingRules, validate, create).get(listReadingsRules, validate, list);

router
  .route('/:id')
  .get(readingIdRule, validate, getOne)
  .put(readingIdRule, updateReadingRules, validate, update)
  .delete(readingIdRule, validate, remove);

module.exports = router;
