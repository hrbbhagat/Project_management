const db = require('../config/database');

/**
 * GET /api/health
 * Lightweight API status check.
 */
const getApiHealth = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API is running',
  });
};

/**
 * GET /api/health/db
 * Live PostgreSQL connectivity probe.
 */
const getDatabaseHealth = async (req, res, next) => {
  try {
    const result = await db.query('SELECT 1 AS probe');

    if (result && result.rows && result.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Database connected',
      });
    }

    return res.status(503).json({
      success: false,
      message: 'Database unresponsive',
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

module.exports = {
  getApiHealth,
  getDatabaseHealth,
};
