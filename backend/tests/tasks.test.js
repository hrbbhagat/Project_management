const { test, describe, after, before } = require('node:test');
const assert = require('node:assert/strict');
const { request, createTestUser, cleanupUser } = require('./helpers');

describe('Task Management API Tests (PHASE 1)', () => {
  let userA, userB;
  let projectA, projectB;
  let createdTaskId = null;

  before(async () => {
    userA = await createTestUser('taskUserA');
    userB = await createTestUser('taskUserB');

    // Create a project for userA
    const projResA = await request('/projects', {
      method: 'POST',
      body: { name: 'Tasks Project A', status: 'IN_PROGRESS' },
      token: userA.token,
    });
    projectA = projResA.body.data;

    // Create a project for userB
    const projResB = await request('/projects', {
      method: 'POST',
      body: { name: 'Tasks Project B', status: 'IN_PROGRESS' },
      token: userB.token,
    });
    projectB = projResB.body.data;
  });

  after(async () => {
    await cleanupUser(userA?.user?.id);
    await cleanupUser(userB?.user?.id);
  });

  test('TASK-001: Create task for project with valid data', async () => {
    const payload = {
      project_id: projectA.id,
      title: 'Implement Integration Tests',
      description: 'Write comprehensive backend verification suite',
      status: 'PENDING',
      priority: 'HIGH',
      due_date: '2026-12-31',
    };

    const res = await request('/tasks', {
      method: 'POST',
      body: payload,
      token: userA.token,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.title, payload.title);
    assert.equal(res.body.data.status, 'PENDING');
    assert.equal(res.body.data.priority, 'HIGH');
    assert.equal(res.body.data.project_id, projectA.id);

    createdTaskId = res.body.data.id;
  });

  test('TASK-002: Get all tasks for authenticated user', async () => {
    const res = await request('/tasks', {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((t) => t.id === createdTaskId));
  });

  test('TASK-003: Get task by ID returns task details', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, createdTaskId);
    assert.equal(res.body.data.title, 'Implement Integration Tests');
  });

  test('TASK-004: Update task title and description', async () => {
    const updatePayload = {
      title: 'Implement Integration Tests (Updated)',
      description: 'Refined description for task',
    };

    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'PUT',
      body: updatePayload,
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, updatePayload.title);
  });

  test('TASK-006: Mark task completed (DONE)', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'PUT',
      body: { status: 'DONE' },
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'DONE');
    assert.ok(res.body.data.completed_at, 'Should populate completed_at timestamp');
  });

  test('TASK-007: Change status to IN_PROGRESS and clear completed_at', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'PUT',
      body: { status: 'IN_PROGRESS' },
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'IN_PROGRESS');
  });

  test('TASK-008: Change priority to URGENT', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'PUT',
      body: { priority: 'URGENT' },
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.priority, 'URGENT');
  });

  test('TASK-009: Invalid priority rejected with 400', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'PUT',
      body: { priority: 'INVALID_PRIORITY_VALUE' },
      token: userA.token,
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('TASK-010: Invalid status rejected with 400', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'PUT',
      body: { status: 'INVALID_STATUS_VALUE' },
      token: userA.token,
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('TASK-011: Invalid due date rejected with 400', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'PUT',
      body: { due_date: 'not-a-valid-date' },
      token: userA.token,
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('TASK-012: Unauthorized task access rejected with 401', async () => {
    const res = await request(`/tasks/${createdTaskId}`);
    assert.equal(res.status, 401);
  });

  test('TASK-013: User B cannot modify User A task (403/404 isolation)', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'PUT',
      body: { title: 'Corrupted by User B' },
      token: userB.token,
    });

    assert.ok([403, 404].includes(res.status), 'Must block cross-tenant task update');
  });

  test('TASK-014: User B cannot delete User A task (403/404 isolation)', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'DELETE',
      token: userB.token,
    });

    assert.ok([403, 404].includes(res.status), 'Must block cross-tenant task deletion');
  });

  test('TASK-015: Search task by keyword returns matching items', async () => {
    const res = await request('/tasks?search=Integration', {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((t) => t.title.includes('Integration')));
  });

  test('TASK-016: Filter task by status returns matching status only', async () => {
    const res = await request('/tasks?status=IN_PROGRESS', {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((t) => t.status === 'IN_PROGRESS'));
  });

  test('TASK-017: Filter task by priority returns matching priority only', async () => {
    const res = await request('/tasks?priority=URGENT', {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((t) => t.priority === 'URGENT'));
  });

  test('TASK-005: Delete task removes it from database', async () => {
    const res = await request(`/tasks/${createdTaskId}`, {
      method: 'DELETE',
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const checkRes = await request(`/tasks/${createdTaskId}`, {
      token: userA.token,
    });
    assert.equal(checkRes.status, 404);
  });
});
