const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authRateLimiter } = require('../middleware/rateLimit.middleware');

// Public Authentication Endpoints (protected by auth rate limiter)
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/logout', authController.logout);

// Protected Authentication Endpoints
router.get('/me', authenticate, authController.getMe);

module.exports = router;
