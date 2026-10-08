const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');

// Serve OpenAPI Specification JSON
router.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve Interactive Swagger UI
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Project Management API Docs',
}));

module.exports = router;
