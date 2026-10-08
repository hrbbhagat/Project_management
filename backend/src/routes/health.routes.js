const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// API Health Check
router.get('/health', healthController.getApiHealth);

// Database Health Check
router.get('/health/db', healthController.getDatabaseHealth);

module.exports = router;
