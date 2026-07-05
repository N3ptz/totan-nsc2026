const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3100';
const API_URL  = 'http://localhost:3000';
const OUT_DIR  = path.join(__dirname, '..', 'screenshots');

// Fake data for API mocks
const FAKE_USER = { id: 'u1', email: 'doctor@totan.dev', role: 'doctor', profile: { fullName: 'นพ.สมชาย ใจดี', avatarUrl: null } };
const FAKE_CHILDREN = [
  { id: 'c1', name: 'ด.ช.กรวิชญ์ สมบูรณ์', dateOfBirth: '2018-03-12', sex: 'M', parentId: 'p1', doctorId: 'u1', ethnicity: 'Thai', heightCm: 112, weightKg: 19, createdAt: new Date().toISOString() },
  { id: 'c2', name: 'ด.ญ.นภัสสร ศิริ',    dateOfBirth: '2016-07-25', sex: 'F', parentId: 'p2', doctorId: 'u1', ethnicity: 'Thai', heightCm: 125, weightKg: 24, createdAt: new Date().toISOString() },
];
const FAKE_ASSESSMENTS = [
  { id: 'a1', childId: 'c1', doctorId: 'u1', status: 'completed', xrayImageUrl: '', boneAgeMonths: 78, confidence: 0.94, riskFlag: 'normal', heightCm: 112, weightKg: 19, createdAt: new Date().toISOString() },
];
const FAKE_RECOMMENDATIONS = [];

async function mockApis(page) {
  await page.route(`${API_URL}/auth/me`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_USER) }));
  await page.route(`${API_URL}/children`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_CHILDREN) }));
  await page.route(`${API_URL}/children/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_CHILDREN[0]) }));
  await page.route(`${API_URL}/assessments/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_ASSESSMENTS) }));
  await page.route(`${API_URL}/recommendations/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_RECOMMENDATIONS) }));
  await page.route(`${API_URL}/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
}

async function injectAuth(page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'fake-jwt-token-for-screenshot');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'doctor@totan.dev', role: 'doctor', profile: { fullName: 'นพ.สมชาย ใจดี' } }));
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lang', 'th');
  });
}

const publicPages = [
  { name: '01-landing', url: '/' },
  { name: '02-login',   url: '/login' },
];

const authPages = [
  { name: '03-dashboard',        url: '/dashboard' },
  { name: '04-patients',         url: '/dashboard/patients' },
  { name: '05-patients-new',     url: '/dashboard/patients/new' },
  { name: '06-assessments',      url: '/dashboard/assessments' },
  { name: '07-reports',          url: '/dashboard/reports' },
  { name: '08-recommendations',  url: '/dashboard/recommendations' },
  { name: '09-settings',         url: '/dashboard/settings' },
];

async function screenshot(page, name, url) {
  console.log(`  → ${url}`);
  try {
    await page.goto(BASE_URL + url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);
    const outPath = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`    ✓ ${name}.png`);
  } catch (e) {
    console.log(`    ✗ Failed: ${e.message}`);
  }
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // ── Public pages ──────────────────────────────────────────
  console.log('\nPublic pages:');
  {
    const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    for (const p of publicPages) await screenshot(page, p.name, p.url);
    await ctx.close();
  }

  // ── Authenticated dashboard pages ─────────────────────────
  console.log('\nDashboard pages (mocked auth):');
  {
    const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await injectAuth(page);
    await mockApis(page);
    for (const p of authPages) await screenshot(page, p.name, p.url);
    await ctx.close();
  }

  await browser.close();
  console.log(`\nDone! Screenshots saved to: ${OUT_DIR}\n`);
}

run().catch(console.error);
