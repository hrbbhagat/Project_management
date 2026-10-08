const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'project_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  max: process.env.NODE_ENV === 'test' ? 5 : 20,
  idleTimeoutMillis: process.env.NODE_ENV === 'test' ? 500 : 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
