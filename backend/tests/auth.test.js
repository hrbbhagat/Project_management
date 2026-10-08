const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { request, createTestUser, cleanupUser } = require('./helpers');

describe('Authentication & Session API Tests (PHASE 1)', () => {
  let createdUserIds = [];

  after(async () => {
    for (const id of createdUserIds) {
      await cleanupUser(id);
    }
  });

  test('REGISTER-001: Valid user registration creates user and excludes password_hash', async () => {
    const timestamp = Date.now();
    const payload = {
      full_name: `Alice Test ${timestamp}`,
      email: `alice_${timestamp}_${Math.random().toString(36).substring(7)}@example.com`,
      password: 'Password123!',
    };

    const res = await request('/auth/register', {
      method: 'POST',
      body: payload,
    });

    assert.equal(res.status, 201, 'Should return HTTP 201 Created');
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id, 'Should have user ID');
    assert.equal(res.body.data.email, payload.email.toLowerCase());
    assert.equal(res.body.data.full_name, payload.full_name);
    assert.equal(res.body.data.password_hash, undefined, 'Password hash must NOT be leaked');
    assert.equal(res.body.data.password, undefined, 'Password must NOT be leaked');

    createdUserIds.push(res.body.data.id);
  });

  test('REGISTER-002: Duplicate email registration returns 409 Conflict', async () => {
    const timestamp = Date.now();
    const payload = {
      full_name: `Duplicate User ${timestamp}`,
      email: `duplicate_${timestamp}_${Math.random().toString(36).substring(7)}@example.com`,
      password: 'Password123!',
    };

    const res1 = await request('/auth/register', { method: 'POST', body: payload });
    assert.equal(res1.status, 201);
    createdUserIds.push(res1.body.data.id);

    const res2 = await request('/auth/register', { method: 'POST', body: payload });
    assert.equal(res2.status, 409, 'Duplicate email should return 409');
    assert.equal(res2.body.success, false);
  });

  test('REGISTER-003: Invalid email format returns 400 Bad Request', async () => {
    const payload = {
      full_name: 'Invalid Email User',
      email: 'not-an-email',
      password: 'Password123!',
    };

    const res = await request('/auth/register', { method: 'POST', body: payload });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('REGISTER-004: Missing required fields returns 400 Bad Request', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: { email: 'incomplete@example.com', password: 'Password123!' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('REGISTER-005: Empty or short password (< 8 chars) returns 400 Bad Request', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: { full_name: 'Short Pass', email: 'short@example.com', password: 'pass' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('LOGIN-001: Valid credentials returns 200 with JWT token', async () => {
    const user = await createTestUser();
    createdUserIds.push(user.user.id);

    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: user.email, password: user.password },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Should return JWT token');
    assert.equal(res.body.data.email, user.email.toLowerCase());
    assert.equal(res.body.data.password_hash, undefined);
  });

  test('LOGIN-002: Invalid password returns 401 Unauthorized', async () => {
    const user = await createTestUser();
    createdUserIds.push(user.user.id);

    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: user.email, password: 'WrongPassword999!' },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('LOGIN-003: Unknown email returns 401 Unauthorized', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'unknown_ghost_99999@example.com', password: 'Password123!' },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('LOGIN-004: Missing credentials returns 400 Bad Request', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: {},
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('ME-001: GET /api/auth/me with valid Bearer token returns profile', async () => {
    const user = await createTestUser();
    createdUserIds.push(user.user.id);

    const res = await request('/auth/me', {
      token: user.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, user.user.id);
    assert.equal(res.body.data.email, user.email.toLowerCase());
  });

  test('ME-002: GET /api/auth/me without token returns 401 Unauthorized', async () => {
    const res = await request('/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('ME-003: GET /api/auth/me with malformed / invalid token returns 401', async () => {
    const res = await request('/auth/me', {
      token: 'not.a.valid.jwt.signature',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('ME-004: GET /api/auth/me with expired token returns 401 Token Expired', async () => {
    const secret = process.env.JWT_SECRET || 'your_development_jwt_secret_change_in_production';
    const expiredToken = jwt.sign(
      { sub: '11111111-1111-1111-1111-111111111101', role: 'MEMBER' },
      secret,
      { expiresIn: '-1s' }
    );

    const res = await request('/auth/me', {
      token: expiredToken,
    });

    assert.equal(res.status, 401);
    assert.match(res.body.message, /expired/i);
  });

  test('LOGOUT-001: POST /api/auth/logout returns 200 success', async () => {
    const res = await request('/auth/logout', {
      method: 'POST',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});
