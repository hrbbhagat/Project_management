const { test, describe, after, before } = require('node:test');
const assert = require('node:assert/strict');
const { request, createTestUser, cleanupUser } = require('./helpers');

describe('Project Management API Tests (PHASE 1)', () => {
  let userA, userB;
  let createdProjectId = null;

  before(async () => {
    userA = await createTestUser('projA');
    userB = await createTestUser('projB');
  });

  after(async () => {
    await cleanupUser(userA?.user?.id);
    await cleanupUser(userB?.user?.id);
  });

  test('PROJECT-001: Create project with valid attributes', async () => {
    const payload = {
      name: 'Project Alpha Suite',
      description: 'Test project for automated verification',
      status: 'IN_PROGRESS',
      start_date: '2026-01-01',
      due_date: '2026-12-31',
    };

    const res = await request('/projects', {
      method: 'POST',
      body: payload,
      token: userA.token,
    });

    assert.equal(res.status, 201, 'Should create project with 201');
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.name, payload.name);
    assert.equal(res.body.data.status, 'IN_PROGRESS');
    assert.equal(res.body.data.owner_id, userA.user.id);

    createdProjectId = res.body.data.id;
  });

  test('PROJECT-002: Get projects returns list for authenticated user', async () => {
    const res = await request('/projects', {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((p) => p.id === createdProjectId));
  });

  test('PROJECT-003: Get project by ID returns single project details', async () => {
    const res = await request(`/projects/${createdProjectId}`, {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, createdProjectId);
    assert.equal(res.body.data.name, 'Project Alpha Suite');
  });

  test('PROJECT-004: Update project modifies status and name', async () => {
    const updatePayload = {
      name: 'Project Alpha Suite (Updated)',
      description: 'Updated description for project',
      status: 'COMPLETED',
    };

    const res = await request(`/projects/${createdProjectId}`, {
      method: 'PUT',
      body: updatePayload,
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, updatePayload.name);
    assert.equal(res.body.data.status, 'COMPLETED');
  });

  test('PROJECT-006: Invalid project data (missing name) returns 400', async () => {
    const res = await request('/projects', {
      method: 'POST',
      body: { description: 'Missing name' },
      token: userA.token,
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('PROJECT-006B: Invalid status enum value returns 400', async () => {
    const res = await request('/projects', {
      method: 'POST',
      body: { name: 'Bad Enum Project', status: 'NON_EXISTENT_STATUS' },
      token: userA.token,
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('PROJECT-007: Unauthorized project access (no token) returns 401', async () => {
    const res = await request(`/projects/${createdProjectId}`);
    assert.equal(res.status, 401);
  });

  test('PROJECT-008: User B cannot read User A project (403/404 isolation)', async () => {
    const res = await request(`/projects/${createdProjectId}`, {
      token: userB.token,
    });

    assert.ok([403, 404].includes(res.status), 'Must reject unauthorized tenant access');
    assert.equal(res.body.success, false);
  });

  test('PROJECT-008B: User B cannot modify User A project (403/404 isolation)', async () => {
    const res = await request(`/projects/${createdProjectId}`, {
      method: 'PUT',
      body: { name: 'Hacked by User B' },
      token: userB.token,
    });

    assert.ok([403, 404].includes(res.status), 'Must prevent cross-tenant mutation');
  });

  test('PROJECT-009: User B cannot delete User A project (403/404 isolation)', async () => {
    const res = await request(`/projects/${createdProjectId}`, {
      method: 'DELETE',
      token: userB.token,
    });

    assert.ok([403, 404].includes(res.status), 'Must prevent cross-tenant deletion');
  });

  test('PROJECT-010: Search project by query filters accurately', async () => {
    const res = await request('/projects?search=Alpha', {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((p) => p.name.includes('Alpha')));
  });

  test('PROJECT-011: Filter project by status returns matching status only', async () => {
    const res = await request('/projects?status=COMPLETED', {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((p) => p.status === 'COMPLETED'));
  });

  test('PROJECT-005: Delete project removes it from database', async () => {
    const res = await request(`/projects/${createdProjectId}`, {
      method: 'DELETE',
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const checkRes = await request(`/projects/${createdProjectId}`, {
      token: userA.token,
    });
    assert.equal(checkRes.status, 404);
  });
});
