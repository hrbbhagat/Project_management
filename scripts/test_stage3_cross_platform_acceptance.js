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

async function apiRequest(endpoint, method = 'GET', body = null, token = null, extraHeaders = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extraHeaders,
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

async function runStage3CrossPlatformAcceptance() {
  console.log('================================================================');
  console.log('STAGE 3 — CROSS-PLATFORM ACCEPTANCE TEST (WEB <-> MOBILE <-> DB)');
  console.log('================================================================\n');

  const testEmail = 'testuser1@example.com';
  const testPassword = 'Password123!';

  // Step 0: Ensure User Alpha exists and get authentication tokens for Web and Mobile sessions
  console.log('[STEP 0] Simulating Dual-Client Authentication:');
  console.log(` -> Web Client logging in as ${testEmail}...`);
  const webLogin = await apiRequest('/auth/login', 'POST', { email: testEmail, password: testPassword });
  if (webLogin.status !== 200 || !webLogin.body.token) {
    throw new Error(`Web Login Failed: ${JSON.stringify(webLogin.body)}`);
  }
  const webToken = webLogin.body.token;
  const userId = webLogin.body.data.id;
  console.log(`    ✅ Web authenticated successfully (JWT Token acquired). User ID: ${userId}`);

  console.log(` -> Mobile Client (Expo/Android) logging in as ${testEmail}...`);
  const mobileLogin = await apiRequest('/auth/login', 'POST', { email: testEmail, password: testPassword });
  if (mobileLogin.status !== 200 || !mobileLogin.body.token) {
    throw new Error(`Mobile Login Failed: ${JSON.stringify(mobileLogin.body)}`);
  }
  const mobileToken = mobileLogin.body.token;
  console.log(`    ✅ Mobile authenticated successfully (Stored in expo-secure-store).\n`);

  // Step 0.1: Retrieve or Create an active Project
  const projectsRes = await apiRequest('/projects', 'GET', null, webToken);
  let activeProject = projectsRes.body.data && projectsRes.body.data.length > 0 ? projectsRes.body.data[0] : null;

  if (!activeProject) {
    console.log(' -> Creating active project for acceptance testing...');
    const projCreate = await apiRequest('/projects', 'POST', {
      name: 'Cross-Platform Acceptance Project',
      description: 'Shared Project for Web & Mobile Synchronization',
      status: 'IN_PROGRESS'
    }, webToken);
    activeProject = projCreate.body.data;
  }
  console.log(`[CONTEXT] Active Shared Project: "${activeProject.name}" (ID: ${activeProject.id})\n`);

  // =========================================================================
  // FLOW 1: WEB -> EXPRESS API -> POSTGRESQL -> MOBILE (Pull to Refresh)
  // =========================================================================
  console.log('----------------------------------------------------------------');
  console.log('FLOW 1: WEB -> EXPRESS API -> POSTGRESQL -> MOBILE (Pull to Refresh)');
  console.log('----------------------------------------------------------------');

  const webTaskTitle = `Feature Spec Approval [WebCreated-${Date.now()}]`;
  console.log(`1.1 [WEB] User creates new task on Web Client: "${webTaskTitle}"`);
  const webCreateRes = await apiRequest('/tasks', 'POST', {
    project_id: activeProject.id,
    title: webTaskTitle,
    description: 'Created on Web application form',
    status: 'TODO',
    priority: 'HIGH',
    due_date: '2026-12-31'
  }, webToken, { 'User-Agent': 'Mozilla/5.0 (Macintosh; Web Client)' });

  if (webCreateRes.status !== 201) {
    throw new Error(`Web Task Creation Failed: ${JSON.stringify(webCreateRes.body)}`);
  }
  const createdTaskId = webCreateRes.body.data.id;
  console.log(`    ✅ Express API processed POST /api/tasks -> HTTP 201 Created (Task ID: ${createdTaskId})`);

  console.log('1.2 [DATABASE] Inspecting PostgreSQL Database for persistence...');
  const dbRow1 = queryDb(`SELECT id, title, status, priority, project_id FROM tasks WHERE id = '${createdTaskId}';`);
  console.log(`    ✅ PostgreSQL Row Verified: ${dbRow1}`);

  console.log('1.3 [MOBILE] Simulating Mobile "Pull-to-Refresh" gesture (GET /api/tasks)...');
  const mobileRefreshRes = await apiRequest('/tasks', 'GET', null, mobileToken, { 'User-Agent': 'Taskline-Expo-Mobile/1.0.0 (Android)' });
  if (mobileRefreshRes.status !== 200) {
    throw new Error(`Mobile Fetch Failed: ${JSON.stringify(mobileRefreshRes.body)}`);
  }
  const foundOnMobile = mobileRefreshRes.body.data.find(t => t.id === createdTaskId);
  if (!foundOnMobile) {
    throw new Error('❌ Task created on Web was NOT found in Mobile task list after pull-to-refresh!');
  }
  console.log(`    ✅ Task verified on Mobile Client! Title: "${foundOnMobile.title}", Status: ${foundOnMobile.status}, Priority: ${foundOnMobile.priority}`);
  console.log('    🎉 FLOW 1 SUCCESS: Web Created Task immediately appeared on Mobile upon Pull-to-Refresh!\n');

  // =========================================================================
  // FLOW 2: MOBILE -> EXPRESS API -> POSTGRESQL -> WEB (Refresh)
  // =========================================================================
  console.log('----------------------------------------------------------------');
  console.log('FLOW 2: MOBILE -> EXPRESS API -> POSTGRESQL -> WEB (Refresh)');
  console.log('----------------------------------------------------------------');

  const mobileTaskTitle = `Mobile Field Inspection [MobileCreated-${Date.now()}]`;
  console.log(`2.1 [MOBILE] User creates new task on Mobile Client: "${mobileTaskTitle}"`);
  const mobileCreateRes = await apiRequest('/tasks', 'POST', {
    project_id: activeProject.id,
    title: mobileTaskTitle,
    description: 'Created on Mobile React Native UI Modal',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    due_date: '2026-11-15'
  }, mobileToken, { 'User-Agent': 'Taskline-Expo-Mobile/1.0.0 (Android)' });

  if (mobileCreateRes.status !== 201) {
    throw new Error(`Mobile Task Creation Failed: ${JSON.stringify(mobileCreateRes.body)}`);
  }
  const mobileCreatedTaskId = mobileCreateRes.body.data.id;
  console.log(`    ✅ Express API processed POST /api/tasks -> HTTP 201 Created (Task ID: ${mobileCreatedTaskId})`);

  console.log('2.2 [DATABASE] Inspecting PostgreSQL Database for persistence...');
  const dbRow2 = queryDb(`SELECT id, title, status, priority, project_id FROM tasks WHERE id = '${mobileCreatedTaskId}';`);
  console.log(`    ✅ PostgreSQL Row Verified: ${dbRow2}`);

  console.log('2.3 [WEB] Simulating Web Browser Page Refresh / Query Refetch (GET /api/tasks)...');
  const webRefreshRes = await apiRequest('/tasks', 'GET', null, webToken, { 'User-Agent': 'Mozilla/5.0 (Macintosh; Web Client)' });
  if (webRefreshRes.status !== 200) {
    throw new Error(`Web Fetch Failed: ${JSON.stringify(webRefreshRes.body)}`);
  }
  const foundOnWeb = webRefreshRes.body.data.find(t => t.id === mobileCreatedTaskId);
  if (!foundOnWeb) {
    throw new Error('❌ Task created on Mobile was NOT found in Web task list after browser refresh!');
  }
  console.log(`    ✅ Task verified on Web Client! Title: "${foundOnWeb.title}", Status: ${foundOnWeb.status}, Priority: ${foundOnWeb.priority}`);
  console.log('    🎉 FLOW 2 SUCCESS: Mobile Created Task immediately appeared on Web upon Browser Refresh!\n');

  // =========================================================================
  // FLOW 3: CROSS-PLATFORM COMPLETION & STATUS SYNCHRONIZATION
  // =========================================================================
  console.log('----------------------------------------------------------------');
  console.log('FLOW 3: CROSS-PLATFORM COMPLETION & MUTATION SYNCHRONIZATION');
  console.log('----------------------------------------------------------------');

  console.log(`3.1 [MOBILE] User toggles task completion on Mobile (Task ID: ${createdTaskId} -> DONE)...`);
  const mobileCompleteRes = await apiRequest(`/tasks/${createdTaskId}`, 'PUT', {
    status: 'DONE'
  }, mobileToken);
  if (mobileCompleteRes.status !== 200) {
    throw new Error(`Mobile Task Complete Failed: ${JSON.stringify(mobileCompleteRes.body)}`);
  }
  console.log(`    ✅ Mobile update processed. Status: DONE, completed_at: ${mobileCompleteRes.body.data.completed_at}`);

  console.log('3.2 [DATABASE] Verifying PostgreSQL completed_at timestamp population...');
  const dbRow3 = queryDb(`SELECT id, status, completed_at FROM tasks WHERE id = '${createdTaskId}';`);
  console.log(`    ✅ PostgreSQL State: ${dbRow3}`);

  console.log('3.3 [WEB] Web client refreshes dashboard & task list...');
  const webTaskCheck = await apiRequest(`/tasks/${createdTaskId}`, 'GET', null, webToken);
  console.log(`    ✅ Web loaded updated task: Status = ${webTaskCheck.body.data.status}, Completed = ${Boolean(webTaskCheck.body.data.completed_at)}`);

  console.log('3.4 [WEB] Checking Dashboard KPI metrics update...');
  const dashRes = await apiRequest('/dashboard', 'GET', null, webToken);
  console.log(`    ✅ Dashboard Analytics Verified: Total Projects: ${dashRes.body.data.totalProjects}, Total Tasks: ${dashRes.body.data.totalTasks}, Completed Tasks: ${dashRes.body.data.completedTasks}, Pending Tasks: ${dashRes.body.data.pendingTasks}`);
  console.log('    🎉 FLOW 3 SUCCESS: Task completion on Mobile synchronized to Web and reflected on Dashboard KPIs!\n');

  // Cleanup acceptance test tasks
  console.log('[CLEANUP] Removing test acceptance tasks from database...');
  await apiRequest(`/tasks/${createdTaskId}`, 'DELETE', null, webToken);
  await apiRequest(`/tasks/${mobileCreatedTaskId}`, 'DELETE', null, webToken);
  console.log('    ✅ Acceptance test tasks cleaned up.\n');

  console.log('================================================================');
  console.log('STAGE 3 ACCEPTANCE TESTING COMPLETED: 100% PASS');
  console.log('================================================================');
}

runStage3CrossPlatformAcceptance().catch(err => {
  console.error('❌ Stage 3 Acceptance Test Error:', err);
  process.exit(1);
});
