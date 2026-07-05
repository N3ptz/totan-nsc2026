const { chromium } = require('playwright');
const path = require('path');

const TOKEN = process.argv[2];
const CHILD_ID = process.argv[3];
const BASE = 'http://localhost:3100';
const OUT = path.join(__dirname, '..', 'screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const payload = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64url').toString());
  await page.addInitScript(({ tok, user }) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lang', 'th');
  }, { tok: TOKEN, user: { id: payload.sub, email: payload.email, role: payload.role } });

  // patients list
  await page.goto(`${BASE}/dashboard/patients`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/04-patients-live.png`, fullPage: true });
  console.log('✓ 04-patients-live.png');

  // patient detail
  await page.goto(`${BASE}/dashboard/patients/${CHILD_ID}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/10-patient-detail.png`, fullPage: true });
  console.log('✓ 10-patient-detail.png');

  // dashboard
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/03-dashboard-live.png`, fullPage: true });
  console.log('✓ 03-dashboard-live.png');

  await browser.close();
  console.log('Done');
})().catch(console.error);
