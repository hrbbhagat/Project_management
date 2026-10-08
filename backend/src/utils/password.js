const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 * @param {string} password 
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plaintext password with a bcrypt hash.
 * @param {string} password 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
