const dashboardService = require('../services/dashboard.service');

/**
 * GET /api/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const metrics = await dashboardService.getDashboardMetrics(req.user.id);
    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
};
