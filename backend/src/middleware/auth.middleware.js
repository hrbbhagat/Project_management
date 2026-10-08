const { verifyToken } = require('../utils/jwt');

/**
 * Authentication Middleware
 * Validates JWT Bearer token from Authorization header and attaches req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Malformed token.',
    });
  }

  try {
    const decoded = verifyToken(token);
    // Attach authenticated identity to req.user for downstream controllers
    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
};

module.exports = {
  authenticate,
};
