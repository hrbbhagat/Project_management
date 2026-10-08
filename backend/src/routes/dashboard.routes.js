const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/dashboard (protected by JWT authentication)
router.get('/', authenticate, dashboardController.getDashboard);

module.exports = router;
