const { test, describe, after, before } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { request, createTestUser, cleanupUser, db } = require('./helpers');

describe('Security & Multi-Tenant Authorization Tests (PHASE 2)', () => {
  let userA, userB;
  let projectA, taskA;

  before(async () => {
    userA = await createTestUser('secUserA');
    userB = await createTestUser('secUserB');

    // Create project and task under user A
    const projRes = await request('/projects', {
      method: 'POST',
      body: { name: 'Secured Project Alpha', status: 'IN_PROGRESS' },
      token: userA.token,
    });
    projectA = projRes.body.data;

    const taskRes = await request('/tasks', {
      method: 'POST',
      body: { project_id: projectA.id, title: 'Secured Task Alpha', status: 'PENDING' },
      token: userA.token,
    });
    taskA = taskRes.body.data;
  });

  after(async () => {
    await cleanupUser(userA?.user?.id);
    await cleanupUser(userB?.user?.id);
  });

  test('SEC-001: Password storage uses bcrypt hash and never stores plaintext', async () => {
    const res = await db.query('SELECT password_hash FROM users WHERE id = $1', [userA.user.id]);
    assert.equal(res.rows.length, 1);
    const hash = res.rows[0].password_hash;
    
    assert.ok(hash.startsWith('$2b$') || hash.startsWith('$2a$'), 'Must be a valid bcrypt hash');
    assert.notEqual(hash, userA.password, 'Must not be plaintext');
    
    const isValid = await bcrypt.compare(userA.password, hash);
    assert.equal(isValid, true, 'bcrypt compare must validate original password');
  });

  test('SEC-002: Cross-user authorization barrier (BOLA protection)', async () => {
    // User B trying to view User A's project
    const projGet = await request(`/projects/${projectA.id}`, { token: userB.token });
    assert.ok([403, 404].includes(projGet.status), 'User B must be blocked from reading User A project');

    // User B trying to update User A's project
    const projPut = await request(`/projects/${projectA.id}`, {
      method: 'PUT',
      body: { name: 'Compromised Project' },
      token: userB.token,
    });
    assert.ok([403, 404].includes(projPut.status), 'User B must be blocked from updating User A project');

    // User B trying to view User A's task
    const taskGet = await request(`/tasks/${taskA.id}`, { token: userB.token });
    assert.ok([403, 404].includes(taskGet.status), 'User B must be blocked from reading User A task');

    // User B trying to update User A's task
    const taskPut = await request(`/tasks/${taskA.id}`, {
      method: 'PUT',
      body: { title: 'Compromised Task' },
      token: userB.token,
    });
    assert.ok([403, 404].includes(taskPut.status), 'User B must be blocked from updating User A task');
  });

  test('SEC-003: SQL Injection resistance via parameterized queries', async () => {
    const maliciousPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE tasks; --",
      "1; SELECT * FROM users;",
      "' UNION SELECT NULL, NULL, NULL--",
    ];

    for (const sqlPayload of maliciousPayloads) {
      // Test search projects
      const projRes = await request(`/projects?search=${encodeURIComponent(sqlPayload)}`, {
        token: userA.token,
      });
      assert.equal(projRes.status, 200, 'Search should handle injection payload safely');
      assert.equal(projRes.body.success, true);

      // Test search tasks
      const taskRes = await request(`/tasks?search=${encodeURIComponent(sqlPayload)}`, {
        token: userA.token,
      });
      assert.equal(taskRes.status, 200, 'Task search should handle injection payload safely');
      assert.equal(taskRes.body.success, true);
    }
  });

  test('SEC-004: Strict Input Validation rejects malformed inputs', async () => {
    // Malformed UUIDs
    const badUuidRes = await request('/projects/not-a-valid-uuid', { token: userA.token });
    assert.ok([400, 404].includes(badUuidRes.status));

    // Excessive length
    const hugeString = 'A'.repeat(5000);
    const badInputRes = await request('/projects', {
      method: 'POST',
      body: { name: hugeString },
      token: userA.token,
    });
    assert.equal(badInputRes.status, 400);
  });
});
