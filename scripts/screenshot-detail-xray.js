const { chromium } = require('C:\\Users\\Thinkpad\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright');
const path = require('path');
const fs = require('fs');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNzg1YmNmYS0wZTlmLTRmMTQtOWE0OS0xYzM4Mjg0YWE1MTIiLCJlbWFpbCI6ImRvY3RvckB0b3Rhbi5kZXYiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzgxODczMTg1LCJleHAiOjE3ODI0Nzc5ODV9.8MhhA2kzqvshkmvVT-GFsrYtPL81-CK4ii2ABv2PWFs';
const CHILD_ID = '055d1c4a-419c-4807-acff-dba5ff821141';
const BASE = 'http://localhost:3100';
const OUT = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.addInitScript((tok) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify({
      id: 'a785bcfa-0e9f-4f14-9a49-1c38284aa512',
      email: 'doctor@totan.dev',
      role: 'doctor'
    }));
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lang', 'th');
  }, TOKEN);

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
