const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT with standard claims.
 * @param {object} payload - Identity claims (e.g. { sub: user.id, role: user.role })
 * @returns {string} Signed JWT string
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'fallback_development_secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm: 'HS256',
  });
};

/**
 * Verifies and decodes a JWT.
 * @param {string} token 
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'fallback_development_secret';
  return jwt.verify(token, secret);
};

module.exports = {
  generateToken,
  verifyToken,
};
