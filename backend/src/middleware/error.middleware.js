/**
 * 404 Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Centralized Application Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle PostgreSQL syntax/constraint errors
  if (err.code === '22P02' || err.code === '22007') {
    statusCode = 400;
    message = 'Invalid input format or syntax.';
  } else if (err.code === '23505') {
    statusCode = 409;
    message = 'A resource with these details already exists.';
  } else if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced foreign resource does not exist.';
  }

  const isDev = process.env.NODE_ENV === 'development';

  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message);
    if (isDev && err.stack) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && statusCode >= 500 && { stack: err.stack }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
