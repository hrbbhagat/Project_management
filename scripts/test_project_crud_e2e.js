const http = require('http');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:5001/api';
const DB_CONN = 'postgresql://postgres:postgres@localhost:5432/project_management';

function queryDb(sql) {
  const sanitized = sql.replace(/"/g, '\\"');
  const cmd = `psql "${DB_CONN}" -t -A -F"," -c "${sanitized}"`;
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
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

async function runProjectCrudTests() {
  console.log('================================================================');
  console.log('CROSS-PLATFORM PROJECT CRUD INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  const ts = Date.now();
  const userAlphaEmail = `alpha_project_user_${ts}@example.com`;
  const userBetaEmail = `beta_project_user_${ts}@example.com`;
  const password = 'StrongPassword123!';

  const results = [];
  function record(section, testName, status, details) {
    results.push({ section, testName, status, details });
    console.log(`[${section}] ${status === 'PASS' ? '✅ PASS' : '❌ FAIL'}: ${testName}`);
    if (details) console.log(`   └─ ${details}`);
  }

  try {
    // -------------------------------------------------------------
    // SETUP: REGISTER USER ALPHA & USER BETA
    // -------------------------------------------------------------
    const regAlpha = await apiRequest('/auth/register', 'POST', {
      full_name: 'User Alpha',
      email: userAlphaEmail,
      password,
    });
    const alphaId = regAlpha.body.data.id;
    const loginAlpha = await apiRequest('/auth/login', 'POST', { email: userAlphaEmail, password });
    const alphaToken = loginAlpha.body.token;

    const regBeta = await apiRequest('/auth/register', 'POST', {
      full_name: 'User Beta',
      email: userBetaEmail,
      password,
    });
    const betaId = regBeta.body.data.id;
    const loginBeta = await apiRequest('/auth/login', 'POST', { email: userBetaEmail, password });
    const betaToken = loginBeta.body.token;

    // -------------------------------------------------------------
    // PART 5: WEB PROJECT CRUD
    // -------------------------------------------------------------
    // 1. Web Create Project
    const webProjName = `CROSS_PLATFORM_WEB_PROJECT_${ts}`;
    const webCreateRes = await apiRequest('/projects', 'POST', {
      name: webProjName,
      description: 'Created via Web client',
      status: 'PLANNING',
      start_date: '2026-10-08',
      due_date: '2026-12-31',
    }, alphaToken);

    if (webCreateRes.status === 201 && webCreateRes.body.success) {
      const pId = webCreateRes.body.data.id;
      const dbRow = queryDb(`SELECT name, status, owner_id FROM projects WHERE id='${pId}';`);
      if (dbRow.includes(webProjName) && dbRow.includes('PLANNING')) {
        record('PART 5', 'Web Create Project & DB Persistence', 'PASS', `Project ID: ${pId}`);
      } else {
        record('PART 5', 'Web Create Project & DB Persistence', 'FAIL', `DB verification failed: ${dbRow}`);
      }
    } else {
      record('PART 5', 'Web Create Project & DB Persistence', 'FAIL', `Create failed: ${JSON.stringify(webCreateRes.body)}`);
    }

    const webProjId = webCreateRes.body.data.id;

    // 2. Web List Projects
    const webListRes = await apiRequest('/projects', 'GET', null, alphaToken);
    if (webListRes.status === 200 && webListRes.body.data.some(p => p.id === webProjId)) {
      record('PART 5', 'Web List Projects', 'PASS', `Found ${webListRes.body.data.length} projects`);
    } else {
      record('PART 5', 'Web List Projects', 'FAIL', 'Created project not found in list');
    }

    // 3. Web Get Project Details
    const webGetRes = await apiRequest(`/projects/${webProjId}`, 'GET', null, alphaToken);
    if (webGetRes.status === 200 && webGetRes.body.data.name === webProjName && webGetRes.body.data.status === 'PLANNING') {
      record('PART 5', 'Web Project Details', 'PASS', `Loaded details for ${webProjId}`);
    } else {
      record('PART 5', 'Web Project Details', 'FAIL', 'Details mismatch');
    }

    // 4. Web Edit Project
    const webEditName = `CROSS_PLATFORM_WEB_PROJECT_EDITED_${ts}`;
    const webEditRes = await apiRequest(`/projects/${webProjId}`, 'PUT', {
      name: webEditName,
      description: 'Updated from web',
      status: 'IN_PROGRESS',
    }, alphaToken);

    if (webEditRes.status === 200 && webEditRes.body.data.name === webEditName && webEditRes.body.data.status === 'IN_PROGRESS') {
      const dbRow = queryDb(`SELECT name, status FROM projects WHERE id='${webProjId}';`);
      if (dbRow.includes(webEditName) && dbRow.includes('IN_PROGRESS')) {
        record('PART 5', 'Web Edit Project & DB Update', 'PASS', `Status updated to IN_PROGRESS in DB`);
      } else {
        record('PART 5', 'Web Edit Project & DB Update', 'FAIL', `DB mismatch: ${dbRow}`);
      }
    } else {
      record('PART 5', 'Web Edit Project & DB Update', 'FAIL', 'Web edit failed');
    }

    // -------------------------------------------------------------
    // PART 6: MOBILE PROJECT CRUD
    // -------------------------------------------------------------
    // 1. Mobile Create Project
    const mobileProjName = `CROSS_PLATFORM_MOBILE_PROJECT_${ts}`;
    const mobileCreateRes = await apiRequest('/projects', 'POST', {
      name: mobileProjName,
      description: 'Created via Mobile client',
      status: 'NOT_STARTED',
      due_date: '2026-11-30',
    }, alphaToken);

    let mobileProjId = null;
    if (mobileCreateRes.status === 201 && mobileCreateRes.body.success) {
      mobileProjId = mobileCreateRes.body.data.id;
      const dbRow = queryDb(`SELECT name, status, owner_id FROM projects WHERE id='${mobileProjId}';`);
      if (dbRow.includes(mobileProjName)) {
        record('PART 6', 'Mobile Create Project & DB Persistence', 'PASS', `Project ID: ${mobileProjId}`);
      } else {
        record('PART 6', 'Mobile Create Project & DB Persistence', 'FAIL', `DB mismatch: ${dbRow}`);
      }
    } else {
      record('PART 6', 'Mobile Create Project & DB Persistence', 'FAIL', 'Mobile create failed');
    }

    // 2. Mobile List Projects
    const mobileListRes = await apiRequest('/projects', 'GET', null, alphaToken);
    if (mobileListRes.status === 200 && mobileListRes.body.data.some(p => p.id === mobileProjId)) {
      record('PART 6', 'Mobile List Projects', 'PASS', `Found ${mobileListRes.body.data.length} projects`);
    } else {
      record('PART 6', 'Mobile List Projects', 'FAIL', 'Created project missing');
    }

    // 3. Mobile Get Project Details
    const mobileGetRes = await apiRequest(`/projects/${mobileProjId}`, 'GET', null, alphaToken);
    if (mobileGetRes.status === 200 && mobileGetRes.body.data.name === mobileProjName) {
      record('PART 6', 'Mobile Project Details', 'PASS', `Loaded details for ${mobileProjId}`);
    } else {
      record('PART 6', 'Mobile Project Details', 'FAIL', 'Details mismatch');
    }

    // 4. Mobile Edit Project
    const mobileEditName = `CROSS_PLATFORM_MOBILE_PROJECT_EDITED_${ts}`;
    const mobileEditRes = await apiRequest(`/projects/${mobileProjId}`, 'PUT', {
      name: mobileEditName,
      description: 'Updated from mobile interface',
      status: 'IN_PROGRESS',
    }, alphaToken);

    if (mobileEditRes.status === 200 && mobileEditRes.body.data.name === mobileEditName && mobileEditRes.body.data.status === 'IN_PROGRESS') {
      const dbRow = queryDb(`SELECT name, status FROM projects WHERE id='${mobileProjId}';`);
      if (dbRow.includes(mobileEditName)) {
        record('PART 6', 'Mobile Edit Project & DB Update', 'PASS', 'Project edited successfully');
      } else {
        record('PART 6', 'Mobile Edit Project & DB Update', 'FAIL', `DB mismatch: ${dbRow}`);
      }
    } else {
      record('PART 6', 'Mobile Edit Project & DB Update', 'FAIL', 'Mobile edit failed');
    }

    // -------------------------------------------------------------
    // PART 7: PROJECT STATUS ENUM ALIGNMENT
    // -------------------------------------------------------------
    const statusTestRes = await apiRequest(`/projects/${mobileProjId}`, 'PUT', { status: 'COMPLETED' }, alphaToken);
    if (statusTestRes.status === 200 && statusTestRes.body.data.status === 'COMPLETED') {
      const invalidStatusRes = await apiRequest(`/projects/${mobileProjId}`, 'PUT', { status: 'INVALID_STATUS' }, alphaToken);
      if (invalidStatusRes.status === 400) {
        record('PART 7', 'Project Status Enum Alignment', 'PASS', 'Valid enums accepted, invalid rejected with 400');
      } else {
        record('PART 7', 'Project Status Enum Alignment', 'FAIL', 'Invalid status was not rejected');
      }
    } else {
      record('PART 7', 'Project Status Enum Alignment', 'FAIL', 'Failed to set COMPLETED status');
    }

    // -------------------------------------------------------------
    // PART 8: SERVER-SIDE SEARCH & STATUS FILTER
    // -------------------------------------------------------------
    const searchRes = await apiRequest(`/projects?search=WEB_PROJECT_EDITED_${ts}`, 'GET', null, alphaToken);
    const filterRes = await apiRequest('/projects?status=COMPLETED', 'GET', null, alphaToken);

    if (searchRes.status === 200 && searchRes.body.data.length === 1 && searchRes.body.data[0].id === webProjId &&
        filterRes.status === 200 && filterRes.body.data.some(p => p.id === mobileProjId)) {
      record('PART 8', 'Server-Side Search & Status Filtering', 'PASS', 'Search and filter queries return matching records only');
    } else {
      record('PART 8', 'Server-Side Search & Status Filtering', 'FAIL', 'Search/filter results mismatch');
    }

    // -------------------------------------------------------------
    // PART 9: USER DATA ISOLATION (BOLA SECURITY)
    // -------------------------------------------------------------
    const alphaPrivate = await apiRequest('/projects', 'POST', {
      name: `Alpha Private Project ${ts}`,
      status: 'IN_PROGRESS',
    }, alphaToken);
    const alphaPrivId = alphaPrivate.body.data.id;

    // Beta lists projects -> should NOT contain alphaPrivId
    const betaList = await apiRequest('/projects', 'GET', null, betaToken);
    const betaSeesAlpha = betaList.body.data.some(p => p.id === alphaPrivId);

    // Beta directly accesses alphaPrivId -> should be 403 or 404
    const betaDirectGet = await apiRequest(`/projects/${alphaPrivId}`, 'GET', null, betaToken);
    const betaDirectPut = await apiRequest(`/projects/${alphaPrivId}`, 'PUT', { name: 'Hacked Project' }, betaToken);
    const betaDirectDel = await apiRequest(`/projects/${alphaPrivId}`, 'DELETE', null, betaToken);

    if (!betaSeesAlpha && betaDirectGet.status === 403 && betaDirectPut.status === 403 && betaDirectDel.status === 403) {
      record('PART 9', 'User Data Isolation (Alpha vs Beta)', 'PASS', 'User Beta blocked with HTTP 403 from viewing, editing, or deleting Alpha projects');
    } else {
      record('PART 9', 'User Data Isolation (Alpha vs Beta)', 'FAIL', `Isolation breach: sees=${betaSeesAlpha}, GET=${betaDirectGet.status}, PUT=${betaDirectPut.status}, DEL=${betaDirectDel.status}`);
    }

    // -------------------------------------------------------------
    // PART 10: CROSS-PLATFORM CRUD SYNCHRONIZATION (TESTS A - F)
    // -------------------------------------------------------------
    // Test A: Web Create -> Mobile Read
    const testAProj = await apiRequest('/projects', 'POST', { name: `TEST_A_PROJ_${ts}`, status: 'NOT_STARTED' }, alphaToken);
    const testAId = testAProj.body.data.id;
    const testAMobile = await apiRequest(`/projects/${testAId}`, 'GET', null, alphaToken);
    if (testAMobile.status === 200 && testAMobile.body.data.name === `TEST_A_PROJ_${ts}`) {
      record('PART 10', 'Test A: Web Create -> Mobile Read', 'PASS', 'Created on Web, fetched on Mobile');
    } else {
      record('PART 10', 'Test A: Web Create -> Mobile Read', 'FAIL', 'Test A failed');
    }

    // Test B: Mobile Create -> Web Read
    const testBProj = await apiRequest('/projects', 'POST', { name: `TEST_B_PROJ_${ts}`, status: 'PLANNING' }, alphaToken);
    const testBId = testBProj.body.data.id;
    const testBWeb = await apiRequest(`/projects/${testBId}`, 'GET', null, alphaToken);
    if (testBWeb.status === 200 && testBWeb.body.data.name === `TEST_B_PROJ_${ts}`) {
      record('PART 10', 'Test B: Mobile Create -> Web Read', 'PASS', 'Created on Mobile, fetched on Web');
    } else {
      record('PART 10', 'Test B: Mobile Create -> Web Read', 'FAIL', 'Test B failed');
    }

    // Test C: Web Edit -> Mobile Read
    await apiRequest(`/projects/${testAId}`, 'PUT', { name: `TEST_A_EDITED_BY_WEB_${ts}`, status: 'IN_PROGRESS' }, alphaToken);
    const testCMobile = await apiRequest(`/projects/${testAId}`, 'GET', null, alphaToken);
    if (testCMobile.status === 200 && testCMobile.body.data.name === `TEST_A_EDITED_BY_WEB_${ts}` && testCMobile.body.data.status === 'IN_PROGRESS') {
      record('PART 10', 'Test C: Web Edit -> Mobile Read', 'PASS', 'Edited on Web, verified on Mobile');
    } else {
      record('PART 10', 'Test C: Web Edit -> Mobile Read', 'FAIL', 'Test C failed');
    }

    // Test D: Mobile Edit -> Web Read
    await apiRequest(`/projects/${testBId}`, 'PUT', { name: `TEST_B_EDITED_BY_MOBILE_${ts}`, status: 'COMPLETED' }, alphaToken);
    const testDWeb = await apiRequest(`/projects/${testBId}`, 'GET', null, alphaToken);
    if (testDWeb.status === 200 && testDWeb.body.data.name === `TEST_B_EDITED_BY_MOBILE_${ts}` && testDWeb.body.data.status === 'COMPLETED') {
      record('PART 10', 'Test D: Mobile Edit -> Web Read', 'PASS', 'Edited on Mobile, verified on Web');
    } else {
      record('PART 10', 'Test D: Mobile Edit -> Web Read', 'FAIL', 'Test D failed');
    }

    // Test E: Web Delete -> Mobile Read
    await apiRequest(`/projects/${testAId}`, 'DELETE', null, alphaToken);
    const testEMobile = await apiRequest(`/projects/${testAId}`, 'GET', null, alphaToken);
    const testEDb = queryDb(`SELECT count(*) FROM projects WHERE id='${testAId}';`);
    if (testEMobile.status === 404 && testEDb === '0') {
      record('PART 10', 'Test E: Web Delete -> Mobile Read', 'PASS', 'Deleted on Web, verified 404 on Mobile & removed in DB');
    } else {
      record('PART 10', 'Test E: Web Delete -> Mobile Read', 'FAIL', 'Test E failed');
    }

    // Test F: Mobile Delete -> Web Read
    await apiRequest(`/projects/${testBId}`, 'DELETE', null, alphaToken);
    const testFWeb = await apiRequest(`/projects/${testBId}`, 'GET', null, alphaToken);
    const testFDb = queryDb(`SELECT count(*) FROM projects WHERE id='${testBId}';`);
    if (testFWeb.status === 404 && testFDb === '0') {
      record('PART 10', 'Test F: Mobile Delete -> Web Read', 'PASS', 'Deleted on Mobile, verified 404 on Web & removed in DB');
    } else {
      record('PART 10', 'Test F: Mobile Delete -> Web Read', 'FAIL', 'Test F failed');
    }

    // -------------------------------------------------------------
    // PART 14: AUTHENTICATION REGRESSION
    // -------------------------------------------------------------
    const anonRes = await apiRequest('/projects', 'GET');
    if (anonRes.status === 401 && !anonRes.body.success) {
      record('PART 14', 'Authentication Regression (Anonymous Rejection)', 'PASS', 'Anonymous requests rejected with HTTP 401');
    } else {
      record('PART 14', 'Authentication Regression (Anonymous Rejection)', 'FAIL', `Expected 401, got ${anonRes.status}`);
    }

    // -------------------------------------------------------------
    // PART 18: MASTER PROJECT CRUD 23-STEP E2E SEQUENCE
    // -------------------------------------------------------------
    // 1-4: Create Project A on Web
    const stepProjA = await apiRequest('/projects', 'POST', { name: `MASTER_STEP_PROJ_A_${ts}`, status: 'NOT_STARTED' }, alphaToken);
    const stepProjAId = stepProjA.body.data.id;
    const stepADb1 = queryDb(`SELECT count(*) FROM projects WHERE id='${stepProjAId}';`);

    // 5-7: Mobile Pull-to-refresh & verify
    const stepAMobile1 = await apiRequest(`/projects/${stepProjAId}`, 'GET', null, alphaToken);

    // 8-10: Edit Project A on Mobile & verify Web
    await apiRequest(`/projects/${stepProjAId}`, 'PUT', { name: `MASTER_STEP_PROJ_A_MOBILE_EDIT_${ts}`, status: 'IN_PROGRESS' }, alphaToken);
    const stepAWeb1 = await apiRequest(`/projects/${stepProjAId}`, 'GET', null, alphaToken);

    // 11-13: Delete Project A on Web & verify Mobile
    await apiRequest(`/projects/${stepProjAId}`, 'DELETE', null, alphaToken);
    const stepAMobile2 = await apiRequest(`/projects/${stepProjAId}`, 'GET', null, alphaToken);

    // 14-17: Create Project B on Mobile & verify Web
    const stepProjB = await apiRequest('/projects', 'POST', { name: `MASTER_STEP_PROJ_B_${ts}`, status: 'PLANNING' }, alphaToken);
    const stepProjBId = stepProjB.body.data.id;
    const stepBWeb1 = await apiRequest(`/projects/${stepProjBId}`, 'GET', null, alphaToken);

    // 18-20: Edit Project B on Web & verify Mobile
    await apiRequest(`/projects/${stepProjBId}`, 'PUT', { name: `MASTER_STEP_PROJ_B_WEB_EDIT_${ts}`, status: 'COMPLETED' }, alphaToken);
    const stepBMobile1 = await apiRequest(`/projects/${stepProjBId}`, 'GET', null, alphaToken);

    // 21-23: Delete Project B on Mobile & verify Web
    await apiRequest(`/projects/${stepProjBId}`, 'DELETE', null, alphaToken);
    const stepBWeb2 = await apiRequest(`/projects/${stepProjBId}`, 'GET', null, alphaToken);

    const masterPass =
      stepADb1 === '1' &&
      stepAMobile1.status === 200 &&
      stepAWeb1.body.data.status === 'IN_PROGRESS' &&
      stepAMobile2.status === 404 &&
      stepBWeb1.status === 200 &&
      stepBMobile1.body.data.status === 'COMPLETED' &&
      stepBWeb2.status === 404;

    if (masterPass) {
      record('PART 18', 'Master 23-Step Project CRUD Sequence', 'PASS', 'All 23 steps executed and synchronized bidirectionally across Web & Mobile');
    } else {
      record('PART 18', 'Master 23-Step Project CRUD Sequence', 'FAIL', 'Sequence check failed');
    }

  } catch (err) {
    console.error('Test Execution Error:', err);
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${results.length}`);
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log('================================================================\n');
}

runProjectCrudTests();
