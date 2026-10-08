const db = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const auditService = require('./audit.service');

// Strict RFC 5322 compatible email format regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Registers a new user.
 */
const register = async ({ full_name, email, password }) => {
  // 1. Backend Input Validation
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
    const error = new Error('Full name is required and cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  if (full_name.trim().length < 2 || full_name.trim().length > 100) {
    const error = new Error('Full name must be between 2 and 100 characters.');
    error.statusCode = 400;
    throw error;
  }

  if (!email || typeof email !== 'string') {
    const error = new Error('Email is required.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    const error = new Error('Please provide a valid email address.');
    error.statusCode = 400;
    throw error;
  }

  if (!password || typeof password !== 'string') {
    const error = new Error('Password is required.');
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Duplicate Email Check
  const existingUserResult = await db.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );

  if (existingUserResult.rows.length > 0) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    throw error;
  }

  // 3. Hash Password (bcrypt cost factor 10)
  const passwordHash = await hashPassword(password);

  // 4. Insert User Record
  const insertQuery = `
    INSERT INTO users (full_name, email, password_hash, role)
    VALUES ($1, $2, $3, 'MEMBER')
    RETURNING id, full_name, email, avatar_url, role, is_active, created_at;
  `;

  const result = await db.query(insertQuery, [
    full_name.trim(),
    normalizedEmail,
    passwordHash,
  ]);

  const newUser = result.rows[0];

  // Audit Log: AUTH_REGISTER
  await auditService.logAction({
    userId: newUser.id,
    action: 'AUTH_REGISTER',
    entityType: 'AUTH',
    entityId: newUser.id,
    metadata: { email: newUser.email },
  });

  return newUser;
};

/**
 * Authenticates user credentials and issues a JWT.
 */
const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find active user by normalized email
  const userResult = await db.query(
    `SELECT id, full_name, email, password_hash, role, is_active
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [normalizedEmail]
  );

  if (userResult.rows.length === 0) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    const error = new Error('Account has been deactivated. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  // Verify bcrypt password hash
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT token with sub and role claims
  const token = generateToken({
    sub: user.id,
    role: user.role,
  });

  // Audit Log: AUTH_LOGIN
  await auditService.logAction({
    userId: user.id,
    action: 'AUTH_LOGIN',
    entityType: 'AUTH',
    entityId: user.id,
    metadata: { email: user.email },
  });

  return {
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    },
  };
};

/**
 * Retrieves authenticated user profile by user ID.
 */
const getCurrentUser = async (userId) => {
  const result = await db.query(
    `SELECT id, full_name, email, avatar_url, role, is_active, created_at, updated_at
     FROM users
     WHERE id = $1 AND is_active = TRUE`,
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found or account deactivated.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

module.exports = {
  register,
  login,
  getCurrentUser,
};
