require('dotenv').config();
const app = require('./app');
const db = require('./config/database');

const PORT = parseInt(process.env.PORT, 10) || 5001;

async function startServer() {
  console.log('Starting Project Management System Backend...');

  try {
    // 1. Verify Database Connectivity
    const startTime = Date.now();
    const result = await db.query('SELECT NOW() AS db_time, current_database() AS db_name');
    const latencyMs = Date.now() - startTime;

    const dbName = result.rows[0].db_name;
    const dbTime = result.rows[0].db_time;
    console.log(`[Database] Connected successfully to "${dbName}" (${latencyMs}ms) at ${dbTime}`);

    // 2. Start HTTP Server
    const server = app.listen(PORT, () => {
      console.log(`[Server] Backend server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
      console.log(`[Health] Health check available at http://localhost:${PORT}/api/health`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server Error] Port ${PORT} is already in use. Please specify another PORT in backend/.env`);
      } else {
        console.error('[Server Error]', err.message);
      }
      process.exit(1);
    });

    // 3. Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await db.pool.end();
          console.log('[Database] Connection pool closed.');
          process.exit(0);
        } catch (err) {
          console.error('[Database] Error closing pool:', err.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('[Fatal] Failed to connect to the database on startup:');
    console.error(error.message);
    console.error('\nPlease verify your PostgreSQL service and environment configuration in backend/.env:');
    console.error(`DB_HOST=${process.env.DB_HOST || 'localhost'}`);
    console.error(`DB_PORT=${process.env.DB_PORT || 5432}`);
    console.error(`DB_NAME=${process.env.DB_NAME || 'project_management'}`);
    console.error(`DB_USER=${process.env.DB_USER || 'postgres'}`);
    process.exit(1);
  }
}

startServer();
