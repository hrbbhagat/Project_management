const authService = require('../services/auth.service');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body;
    const user = await authService.register({ full_name, email, password });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const authResult = await authService.login({ email, password });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: authResult.token,
      data: authResult.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Stateless JWT logout: returns success confirmation and instructs client to purge token.
 */
const logout = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logout successful. Please discard your authentication token on the client.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Protected endpoint returning the authenticated user's profile.
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
