const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

// Pool configuration supporting both Neon/Cloud DATABASE_URL and local DB_* fallbacks
const poolConfig = hasDatabaseUrl
  ? {
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: isProduction || process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : false,
      max: process.env.NODE_ENV === 'test' ? 5 : 20,
      idleTimeoutMillis: process.env.NODE_ENV === 'test' ? 500 : 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'project_management',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
      ssl: false,
      max: process.env.NODE_ENV === 'test' ? 5 : 20,
      idleTimeoutMillis: process.env.NODE_ENV === 'test' ? 500 : 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
