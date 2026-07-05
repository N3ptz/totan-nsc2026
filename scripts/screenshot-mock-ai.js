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
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Inject auth before any navigation
  const payload = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64url').toString());
  await page.addInitScript(({ tok, user }) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lang', 'th');
  }, { tok: TOKEN, user: { id: payload.sub, email: payload.email, role: payload.role } });

  console.log('→ Navigating to patient detail page...');
  await page.goto(`${BASE}/dashboard/patients/${CHILD_ID}`, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2000);

  // Screenshot: before clicking Simulate AI (should show pending assessment)
  await page.screenshot({ path: path.join(OUT, '11-mock-ai-before.png'), fullPage: true });
  console.log('✓ 11-mock-ai-before.png (pending assessment visible)');

  // Find and click the "จำลอง AI" button
  // The button text may be encoded differently, so try multiple selectors
  console.log('→ Looking for simulate AI button...');
  // Debug: print all button texts on page
  const allBtns = await page.locator('button').allTextContents();
  console.log('  Buttons found:', allBtns.filter(t => t.trim()).join(' | '));

  // Try Thai text first, fallback to role+emoji selector
  let simulateBtn = page.locator('button').filter({ hasText: /จำลอง|Simulate AI|🤖/ }).first();
  await simulateBtn.waitFor({ state: 'visible', timeout: 10000 });

  // Scroll into view so it's visible in screenshot
  await simulateBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Screenshot: button visible and highlighted
  await page.screenshot({ path: path.join(OUT, '12-mock-ai-button.png'), fullPage: true });
  console.log('✓ 12-mock-ai-button.png (simulate button highlighted)');

  console.log('→ Clicking จำลอง AI...');
  await simulateBtn.click();
  await page.waitForTimeout(800);

  // Screenshot: processing state (spinner / XrayScanLoader visible)
  await page.screenshot({ path: path.join(OUT, '13-mock-ai-processing.png'), fullPage: true });
  console.log('✓ 13-mock-ai-processing.png (AI processing state)');

  // Wait for completed status — poll checks every 3s in the app, wait up to 30s
  console.log('→ Waiting for AI to complete (polling ~3s intervals)...');
  try {
    await page.waitForSelector('text=เสร็จสิ้น', { timeout: 30000 });
    console.log('  AI completed!');
  } catch {
    console.log('  Timed out waiting for completed — taking screenshot anyway');
  }
  await page.waitForTimeout(1500);

  // Screenshot: after AI completes
  await page.screenshot({ path: path.join(OUT, '14-mock-ai-completed.png'), fullPage: true });
  console.log('✓ 14-mock-ai-completed.png (AI result displayed)');

  // Click "รายละเอียด" (Details) button to open the assessment detail panel
  console.log('→ Opening assessment detail panel...');
  const detailBtn = page.locator('button:has-text("รายละเอียด")').first();
  try {
    await detailBtn.waitFor({ state: 'visible', timeout: 8000 });
    await detailBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, '15-mock-ai-detail.png'), fullPage: true });
    console.log('✓ 15-mock-ai-detail.png (assessment detail panel)');
  } catch {
    console.log('  Detail button not found — skipping detail panel screenshot');
  }

  await browser.close();
  console.log(`\nDone! Screenshots in: ${OUT}`);
})().catch(console.error);
