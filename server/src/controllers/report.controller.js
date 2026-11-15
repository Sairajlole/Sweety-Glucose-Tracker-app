const reportService = require('../services/report.service');

async function daily(req, res, next) {
  try {
    const report = await reportService.dailyReport(req.user.id, req.query.date);

    res.status(200).json({
      success: true,
      message: 'Daily report generated successfully',
      data: { report },
    });
  } catch (err) {
    next(err);
  }
}

async function monthToDate(req, res, next) {
  try {
    const report = await reportService.monthToDateReport(req.user.id, req.query.date);

    res.status(200).json({
      success: true,
      message: 'Month-to-date report generated successfully',
      data: { report },
    });
  } catch (err) {
    next(err);
  }
}

async function previousMonth(req, res, next) {
  try {
    const report = await reportService.previousMonthReport(req.user.id, req.query.date);

    res.status(200).json({
      success: true,
      message: 'Previous month report generated successfully',
      data: { report },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { daily, monthToDate, previousMonth };
