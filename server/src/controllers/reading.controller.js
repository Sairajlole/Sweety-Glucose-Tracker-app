const readingService = require('../services/reading.service');

async function create(req, res, next) {
  try {
    const reading = await readingService.create(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Reading created successfully',
      data: { reading },
    });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { page, limit, from, to, timeSlot } = req.query;

    const { readings, pagination } = await readingService.list(req.user.id, {
      page: page || 1,
      limit: limit || 20,
      from,
      to,
      timeSlot,
    });

    res.status(200).json({
      success: true,
      message: 'Readings retrieved successfully',
      data: { readings, pagination },
    });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const reading = await readingService.getById(req.user.id, req.params.id);

    res.status(200).json({
      success: true,
      message: 'Reading retrieved successfully',
      data: { reading },
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const reading = await readingService.update(req.user.id, req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Reading updated successfully',
      data: { reading },
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = await readingService.remove(req.user.id, req.params.id);

    res.status(200).json({
      success: true,
      message: 'Reading deleted successfully',
      data: { id },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update, remove };
