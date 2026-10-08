const http = require('http');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:5001/api';
const DB_CONN = 'postgresql://postgres:postgres@localhost:5432/project_management';

function queryDb(sql) {
  const sanitized = sql.replace(/"/g, '\\"');
  const cmd = `psql "${DB_CONN}" -t -A -F"|" -c "${sanitized}"`;
  try {
    const output = execSync(cmd, { encoding: 'utf8' }).trim();
    return output;
  } catch (err) {
    throw new Error(`DB Query Failed: ${err.message}`);
  }
}

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSecurityIsolationAcceptance() {
  console.log('================================================================');
  console.log('STAGE 4 — MULTI-TENANT SECURITY & USER ISOLATION ACCEPTANCE');
  console.log('================================================================\n');

  const timestamp = Date.now();

  // 1. Register User A and User B
  const userA_email = `user_a_${timestamp}@example.com`;
  const userB_email = `user_b_${timestamp}@example.com`;
  const password = 'Password123!';

  console.log('[STEP 1] Creating Isolated Test Tenants:');
  console.log(` -> Registering User A (${userA_email})...`);
  const regA = await apiRequest('/auth/register', 'POST', {
    full_name: 'Tenant User A',
    email: userA_email,
    password: password,
  });
  if (regA.status !== 201) throw new Error(`User A Registration Failed: ${JSON.stringify(regA.body)}`);
  const userA_id = regA.body.data.id;

  const loginA = await apiRequest('/auth/login', 'POST', { email: userA_email, password });
  const tokenA = loginA.body.token;
  console.log(`    ✅ User A created. ID: ${userA_id}`);

  console.log(` -> Registering User B (${userB_email})...`);
  const regB = await apiRequest('/auth/register', 'POST', {
    full_name: 'Tenant User B',
    email: userB_email,
    password: password,
  });
  if (regB.status !== 201) throw new Error(`User B Registration Failed: ${JSON.stringify(regB.body)}`);
  const userB_id = regB.body.data.id;

  const loginB = await apiRequest('/auth/login', 'POST', { email: userB_email, password });
  const tokenB = loginB.body.token;
  console.log(`    ✅ User B created. ID: ${userB_id}\n`);

  // 2. Create Project A + Task A for User A
  console.log('[STEP 2] Creating Tenant A Assets (Project A & Task A):');
  const projARes = await apiRequest('/projects', 'POST', {
    name: 'Top Secret Project A',
    description: 'Confidential resources belonging exclusively to User A',
    status: 'IN_PROGRESS',
    start_date: '2026-01-01',
    due_date: '2026-12-31'
  }, tokenA);
  const projectA_id = projARes.body.data.id;
  console.log(`    ✅ Project A created: "${projARes.body.data.name}" (ID: ${projectA_id})`);

  const taskARes = await apiRequest('/tasks', 'POST', {
    project_id: projectA_id,
    title: 'Confidential Task Alpha',
    description: 'Only User A is permitted to see this task',
    status: 'TODO',
    priority: 'HIGH',
    due_date: '2026-10-30'
  }, tokenA);
  const taskA_id = taskARes.body.data.id;
  console.log(`    ✅ Task A created: "${taskARes.body.data.title}" (ID: ${taskA_id})\n`);

  // 3. Create Project B + Task B for User B
  console.log('[STEP 3] Creating Tenant B Assets (Project B & Task B):');
  const projBRes = await apiRequest('/projects', 'POST', {
    name: 'Top Secret Project B',
    description: 'Confidential resources belonging exclusively to User B',
    status: 'IN_PROGRESS',
    start_date: '2026-02-01',
    due_date: '2026-11-30'
  }, tokenB);
  const projectB_id = projBRes.body.data.id;
  console.log(`    ✅ Project B created: "${projBRes.body.data.name}" (ID: ${projectB_id})`);

  const taskBRes = await apiRequest('/tasks', 'POST', {
    project_id: projectB_id,
    title: 'Confidential Task Beta',
    description: 'Only User B is permitted to see this task',
    status: 'TODO',
    priority: 'URGENT',
    due_date: '2026-11-15'
  }, tokenB);
  const taskB_id = taskBRes.body.data.id;
  console.log(`    ✅ Task B created: "${taskBRes.body.data.title}" (ID: ${taskB_id})\n`);

  // 4. Verification Matrix Table
  console.log('----------------------------------------------------------------');
  console.log('4. EXECUTING 16-POINT AUTHORIZATION & ISOLATION MATRIX');
  console.log('----------------------------------------------------------------');

  const testMatrix = [
    // Legitimate User A Access
    { id: 'SEC-A-01', name: 'User A -> Read Project A', actor: 'User A', token: tokenA, method: 'GET', url: `/projects/${projectA_id}`, expectedStatus: 200, shouldPass: true },
    { id: 'SEC-A-02', name: 'User A -> Read Task A', actor: 'User A', token: tokenA, method: 'GET', url: `/tasks/${taskA_id}`, expectedStatus: 200, shouldPass: true },
    
    // Legitimate User B Access
    { id: 'SEC-B-01', name: 'User B -> Read Project B', actor: 'User B', token: tokenB, method: 'GET', url: `/projects/${projectB_id}`, expectedStatus: 200, shouldPass: true },
    { id: 'SEC-B-02', name: 'User B -> Read Task B', actor: 'User B', token: tokenB, method: 'GET', url: `/tasks/${taskB_id}`, expectedStatus: 200, shouldPass: true },

    // Cross-Tenant Attack 1: User A attacking User B Project
    { id: 'SEC-X-01', name: 'User A -> Read Project B (BOLA Violation)', actor: 'User A', token: tokenA, method: 'GET', url: `/projects/${projectB_id}`, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-02', name: 'User A -> Update Project B', actor: 'User A', token: tokenA, method: 'PUT', url: `/projects/${projectB_id}`, body: { name: 'Compromised by A' }, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-03', name: 'User A -> Delete Project B', actor: 'User A', token: tokenA, method: 'DELETE', url: `/projects/${projectB_id}`, expectedStatus: [403, 404], shouldPass: false },

    // Cross-Tenant Attack 2: User A attacking User B Task
    { id: 'SEC-X-04', name: 'User A -> Read Task B (BOLA Violation)', actor: 'User A', token: tokenA, method: 'GET', url: `/tasks/${taskB_id}`, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-05', name: 'User A -> Update Task B', actor: 'User A', token: tokenA, method: 'PUT', url: `/tasks/${taskB_id}`, body: { title: 'Compromised by A' }, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-06', name: 'User A -> Delete Task B', actor: 'User A', token: tokenA, method: 'DELETE', url: `/tasks/${taskB_id}`, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-07', name: 'User A -> Inject Task into Project B', actor: 'User A', token: tokenA, method: 'POST', url: `/tasks`, body: { project_id: projectB_id, title: 'Injected Task' }, expectedStatus: [403, 404], shouldPass: false },

    // Cross-Tenant Attack 3: User B attacking User A Project
    { id: 'SEC-X-08', name: 'User B -> Read Project A (BOLA Violation)', actor: 'User B', token: tokenB, method: 'GET', url: `/projects/${projectA_id}`, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-09', name: 'User B -> Update Project A', actor: 'User B', token: tokenB, method: 'PUT', url: `/projects/${projectA_id}`, body: { name: 'Compromised by B' }, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-10', name: 'User B -> Delete Project A', actor: 'User B', token: tokenB, method: 'DELETE', url: `/projects/${projectA_id}`, expectedStatus: [403, 404], shouldPass: false },

    // Cross-Tenant Attack 4: User B attacking User A Task
    { id: 'SEC-X-11', name: 'User B -> Read Task A (BOLA Violation)', actor: 'User B', token: tokenB, method: 'GET', url: `/tasks/${taskA_id}`, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-12', name: 'User B -> Update Task A', actor: 'User B', token: tokenB, method: 'PUT', url: `/tasks/${taskA_id}`, body: { title: 'Compromised by B' }, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-13', name: 'User B -> Delete Task A', actor: 'User B', token: tokenB, method: 'DELETE', url: `/tasks/${taskA_id}`, expectedStatus: [403, 404], shouldPass: false },
    { id: 'SEC-X-14', name: 'User B -> Inject Task into Project A', actor: 'User B', token: tokenB, method: 'POST', url: `/tasks`, body: { project_id: projectA_id, title: 'Injected Task' }, expectedStatus: [403, 404], shouldPass: false },

    // Anonymous Unauthenticated Attempts
    { id: 'SEC-ANON-01', name: 'Anonymous -> Read Project A', actor: 'Anonymous', token: null, method: 'GET', url: `/projects/${projectA_id}`, expectedStatus: 401, shouldPass: false },
    { id: 'SEC-ANON-02', name: 'Anonymous -> Read Task B', actor: 'Anonymous', token: null, method: 'GET', url: `/tasks/${taskB_id}`, expectedStatus: 401, shouldPass: false },
  ];

  let passedCount = 0;
  for (const item of testMatrix) {
    const res = await apiRequest(item.url, item.method, item.body || null, item.token);
    
    let isExpected = false;
    if (Array.isArray(item.expectedStatus)) {
      isExpected = item.expectedStatus.includes(res.status);
    } else {
      isExpected = res.status === item.expectedStatus;
    }

    if (isExpected) {
      passedCount++;
      const symbol = item.shouldPass ? '✅ PASS (Authorized 200)' : '🔒 PASS (Forbidden/Blocked ' + res.status + ')';
      console.log(`[${item.id}] ${symbol}: ${item.name}`);
    } else {
      console.error(`[${item.id}] ❌ FAIL: ${item.name} -> Expected ${item.expectedStatus} but received HTTP ${res.status}`);
      throw new Error(`Security Test ${item.id} Failed!`);
    }
  }

  // 5. Dashboard Isolation Check
  console.log('\n[STEP 5] Verifying Dashboard KPI Metrics Isolation:');
  const dashA = await apiRequest('/dashboard', 'GET', null, tokenA);
  const dashB = await apiRequest('/dashboard', 'GET', null, tokenB);

  console.log(` -> User A Dashboard: Total Projects = ${dashA.body.data.totalProjects}, Total Tasks = ${dashA.body.data.totalTasks}`);
  console.log(` -> User B Dashboard: Total Projects = ${dashB.body.data.totalProjects}, Total Tasks = ${dashB.body.data.totalTasks}`);

  if (dashA.body.data.totalProjects !== 1 || dashA.body.data.totalTasks !== 1) {
    throw new Error('User A Dashboard counts are corrupted or leaking other tenants data!');
  }
  if (dashB.body.data.totalProjects !== 1 || dashB.body.data.totalTasks !== 1) {
    throw new Error('User B Dashboard counts are corrupted or leaking other tenants data!');
  }
  console.log('    ✅ Dashboard metrics are 100% isolated and tenant-specific.\n');

  // Cleanup
  console.log('[CLEANUP] Purging test tenants and assets from database...');
  queryDb(`
    DELETE FROM tasks WHERE project_id IN ('${projectA_id}', '${projectB_id}');
    DELETE FROM project_members WHERE project_id IN ('${projectA_id}', '${projectB_id}');
    DELETE FROM audit_logs WHERE user_id IN ('${userA_id}', '${userB_id}');
    DELETE FROM projects WHERE id IN ('${projectA_id}', '${projectB_id}');
    DELETE FROM users WHERE id IN ('${userA_id}', '${userB_id}');
  `);
  console.log('    ✅ Cleaned up.\n');

  console.log('================================================================');
  console.log(`SECURITY ACCEPTANCE COMPLETED: ${passedCount + 1}/${testMatrix.length + 1} PASSED (100%)`);
  console.log('================================================================');
}

runSecurityIsolationAcceptance().catch((err) => {
  console.error('❌ Security Acceptance Test Failed:', err);
  process.exit(1);
});
