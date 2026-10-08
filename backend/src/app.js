const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const docsRoutes = require('./routes/docs.routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Security Headers Middleware (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Ensures Swagger UI and cross-origin clients can load resources
    contentSecurityPolicy: false, // Allows inline script evaluation for Swagger UI documentation
  })
);

// CORS Middleware
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((s) => s.trim())
  : ['*'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      /^http:\/\/localhost:[0-9]+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:[0-9]+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Project Management System API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// Mount Routes
app.use('/api/docs', docsRoutes);
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
