const { test, describe, after, before } = require('node:test');
const assert = require('node:assert/strict');
const { request, createTestUser, cleanupUser } = require('./helpers');

describe('Dashboard Statistics & Metrics Tests (PHASE 1)', () => {
  let userA, userB;
  let projectA;
  let createdTasks = [];

  before(async () => {
    userA = await createTestUser('dashUserA');
    userB = await createTestUser('dashUserB');

    // Create 1 project for User A
    const projRes = await request('/projects', {
      method: 'POST',
      body: { name: 'Dashboard Project A', status: 'IN_PROGRESS' },
      token: userA.token,
    });
    projectA = projRes.body.data;

    // Create 2 tasks for User A (1 pending, 1 completed)
    const t1 = await request('/tasks', {
      method: 'POST',
      body: { project_id: projectA.id, title: 'Task 1 Pending', status: 'PENDING', priority: 'HIGH' },
      token: userA.token,
    });
    createdTasks.push(t1.body.data);

    const t2 = await request('/tasks', {
      method: 'POST',
      body: { project_id: projectA.id, title: 'Task 2 Done', status: 'DONE', priority: 'MEDIUM' },
      token: userA.token,
    });
    createdTasks.push(t2.body.data);
  });

  after(async () => {
    await cleanupUser(userA?.user?.id);
    await cleanupUser(userB?.user?.id);
  });

  test('DASH-001: Authenticated dashboard returns HTTP 200 with summary stats', async () => {
    const res = await request('/dashboard', {
      token: userA.token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data, 'Should contain data metrics');
  });

  test('DASH-002: Dashboard counts match database state for authenticated user', async () => {
    const res = await request('/dashboard', {
      token: userA.token,
    });

    const stats = res.body.data;
    assert.equal(parseInt(stats.totalProjects, 10), 1, 'Total projects should be 1');
    assert.equal(parseInt(stats.totalTasks, 10), 2, 'Total tasks should be 2');
    assert.equal(parseInt(stats.completedTasks, 10), 1, 'Completed tasks should be 1');
    assert.equal(parseInt(stats.pendingTasks, 10), 1, 'Pending tasks should be 1');
    assert.equal(parseInt(stats.projectsInProgress, 10), 1, 'In-progress projects should be 1');
  });

  test('DASH-003: Dashboard for User B does NOT reflect User A data (Tenant Isolation)', async () => {
    const res = await request('/dashboard', {
      token: userB.token,
    });

    const stats = res.body.data;
    assert.equal(parseInt(stats.totalProjects, 10), 0, 'User B projects should be 0');
    assert.equal(parseInt(stats.totalTasks, 10), 0, 'User B tasks should be 0');
  });

  test('DASH-004: Dashboard updates dynamically after new task creation', async () => {
    const t3 = await request('/tasks', {
      method: 'POST',
      body: { project_id: projectA.id, title: 'Task 3 In Progress', status: 'IN_PROGRESS' },
      token: userA.token,
    });
    createdTasks.push(t3.body.data);

    const res = await request('/dashboard', {
      token: userA.token,
    });

    assert.equal(parseInt(res.body.data.totalTasks, 10), 3);
  });

  test('DASH-005: Dashboard updates completedTasks count after status mutation', async () => {
    await request(`/tasks/${createdTasks[0].id}`, {
      method: 'PUT',
      body: { status: 'DONE' },
      token: userA.token,
    });

    const res = await request('/dashboard', {
      token: userA.token,
    });

    assert.equal(parseInt(res.body.data.completedTasks, 10), 2);
  });

  test('DASH-006: Unauthorized dashboard request returns 401', async () => {
    const res = await request('/dashboard');
    assert.equal(res.status, 401);
  });
});
