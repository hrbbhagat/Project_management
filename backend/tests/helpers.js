const http = require('http');
const db = require('../src/config/database');
const app = require('../src/app');

let serverInstance = null;
let serverPort = null;

/**
 * Ensures an in-process ephemeral test server is listening
 */
async function getTestServerUrl() {
  if (serverInstance && serverPort) {
    return `http://127.0.0.1:${serverPort}/api`;
  }

  return new Promise((resolve) => {
    serverInstance = http.createServer(app);
    serverInstance.listen(0, '127.0.0.1', () => {
      serverPort = serverInstance.address().port;
      serverInstance.unref();
      resolve(`http://127.0.0.1:${serverPort}/api`);
    });
  });
}

/**
 * Dispatches an HTTP request to the test server
 */
async function request(endpoint, options = {}) {
  const baseUrl = await getTestServerUrl();
  const url = new URL(`${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  
  const { method = 'GET', body, token, headers = {} } = options;

  const reqHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsedBody = null;
          try {
            parsedBody = JSON.parse(rawData);
          } catch {
            parsedBody = rawData;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Creates a unique test user in the database
 */
async function createTestUser(suffix = Date.now()) {
  const email = `testuser_${suffix}_${Math.random().toString(36).substring(7)}@example.com`;
  const password = 'Password123!';
  const full_name = `Test User ${suffix}`;

  const res = await request('/auth/register', {
    method: 'POST',
    body: { full_name, email, password },
  });

  if (res.status !== 201) {
    throw new Error(`Failed to create test user: ${JSON.stringify(res.body)}`);
  }

  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error(`Failed to login test user: ${JSON.stringify(loginRes.body)}`);
  }

  return {
    user: res.body.data,
    token: loginRes.body.token,
    email,
    password,
  };
}

/**
 * Cleanup helper for test data
 */
async function cleanupUser(userId) {
  if (!userId) return;
  try {
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
  } catch (e) {
    // Ignore cleanup errors
  }
}

module.exports = {
  getTestServerUrl,
  request,
  createTestUser,
  cleanupUser,
  db,
};
