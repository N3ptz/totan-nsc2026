const { chromium } = require('C:\\Users\\Thinkpad\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright');
const path = require('path');

const TOKEN = process.argv[2];
const CHILD_ID = process.argv[3];
const BASE = 'http://localhost:3100';
const OUT = path.join(__dirname, '..', 'screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.addInitScript((tok) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify({ id: 'a785bcfa-0e9f-4f14-9a49-1c38284aa512', email: 'doctor@totan.dev', role: 'doctor' }));
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lang', 'th');
  }, TOKEN);

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
