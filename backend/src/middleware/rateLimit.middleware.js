const rateLimit = require('express-rate-limit');

/**
 * Authentication Rate Limiter
 * Limits brute-force login and spam registration attempts.
 */
const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'],
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again later.',
  },
  statusCode: 429,
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json(options.message);
  },
});

/**
 * General API Rate Limiter
 * Protects public API endpoints from Denial of Service (DoS).
 */
const generalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
  },
  statusCode: 429,
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json(options.message);
  },
});

module.exports = {
  authRateLimiter,
  generalApiRateLimiter,
};
