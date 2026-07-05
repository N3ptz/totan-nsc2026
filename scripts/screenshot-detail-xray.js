const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CHILD_ID = process.env.CHILD_ID;
if (!TOKEN || !CHILD_ID) { console.error('ต้องตั้ง env TOKEN และ CHILD_ID ก่อนรัน'); process.exit(1); }
const BASE = 'http://localhost:3100';
const OUT = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

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

  await page.goto(`${BASE}/dashboard/patients/${CHILD_ID}`, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2500);

  // Click "รายละเอียด" on the first completed assessment that has a local xray URL
  // The newest assessment (0d87fef4) will be first
  const detailBtns = page.locator('button:has-text("รายละเอียด")');
  const count = await detailBtns.count();
  console.log(`Found ${count} detail buttons`);

  await detailBtns.first().click();
  await page.waitForTimeout(2000);

  // Wait for the X-ray image to load
  await page.waitForSelector('img[alt="X-ray"]', { timeout: 10000 }).catch(() => console.log('X-ray img not found'));

  await page.screenshot({ path: path.join(OUT, '27-detail-xray-visible.png'), fullPage: true });
  console.log('✓ 27-detail-xray-visible.png');

  await browser.close();
})().catch(console.error);
