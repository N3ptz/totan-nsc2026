const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ห้าม hardcode token/id ลง repo — ใช้ env: TOKEN=<jwt> CHILD_ID=<uuid> node scripts/screenshot-full-flow.js
const TOKEN = process.env.TOKEN;
const CHILD_ID = process.env.CHILD_ID;
if (!TOKEN || !CHILD_ID) {
  console.error('ต้องตั้ง env TOKEN และ CHILD_ID ก่อนรัน เช่น TOKEN=eyJ... CHILD_ID=uuid node scripts/screenshot-full-flow.js');
  process.exit(1);
}
const BASE = 'http://localhost:3100';
const OUT = path.join(__dirname, '..', 'screenshots');
const XRAY_FILE = path.join(__dirname, '..', 'apps', 'web', 'public', 'hand-xray.png');

fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const payload = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64url').toString());
  await page.addInitScript(({ tok, user }) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lang', 'th');
  }, { tok: TOKEN, user: { id: payload.sub, email: payload.email, role: payload.role } });

  console.log('→ Opening patient detail page...');
  await page.goto(`${BASE}/dashboard/patients/${CHILD_ID}`, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2000);

  // ── Step 1: Click "ประเมินใหม่" to open the panel ──
  console.log('→ Clicking ประเมินใหม่...');
  await page.locator('button:has-text("ประเมินใหม่")').click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(OUT, '20-new-assessment-panel.png'), fullPage: true });
  console.log('✓ 20-new-assessment-panel.png (panel open)');

  // ── Step 2: Upload the X-ray file ──
  console.log('→ Uploading X-ray image...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(XRAY_FILE);
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(OUT, '21-xray-preview.png'), fullPage: true });
  console.log('✓ 21-xray-preview.png (X-ray preview showing)');

  // ── Step 3: Fill height & weight ──
  console.log('→ Filling height and weight...');
  // Height input: type="number" min="30"
  await page.locator('input[type="number"][min="30"]').fill('112');
  // Weight input: type="number" min="1"
  await page.locator('input[type="number"][min="1"]').fill('19');
  await page.waitForTimeout(400);

  // ── Step 4: Submit the form ──
  console.log('→ Submitting assessment form...');
  await page.locator('button:has-text("ส่งประเมิน AI")').click();

  // Wait for panel to close and assessment to appear
  await page.waitForTimeout(4000);

  await page.screenshot({ path: path.join(OUT, '22-after-submit.png'), fullPage: true });
  console.log('✓ 22-after-submit.png (after submission, pending/processing state)');

  // ── Step 5: Wait for failed/pending so simulate button appears ──
  // The real AI won't run (no model), so it may fail → button reappears
  console.log('→ Waiting for simulate button to appear...');
  let simulateBtn;
  for (let i = 0; i < 15; i++) {
    simulateBtn = page.locator('button').filter({ hasText: /จำลอง|Simulate AI|🤖/ }).first();
    const visible = await simulateBtn.isVisible().catch(() => false);
    if (visible) break;
    await page.waitForTimeout(3000);
    console.log(`  ... waiting (${(i + 1) * 3}s)`);
  }

  const isVisible = await simulateBtn.isVisible().catch(() => false);
  if (!isVisible) {
    console.log('  Button not visible — taking screenshot anyway');
    await page.screenshot({ path: path.join(OUT, '23-no-button.png'), fullPage: true });
  } else {
    await page.screenshot({ path: path.join(OUT, '23-simulate-ready.png'), fullPage: true });
    console.log('✓ 23-simulate-ready.png (simulate button ready)');

    // ── Step 6: Click จำลอง AI ──
    console.log('→ Clicking จำลอง AI...');
    await simulateBtn.click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(OUT, '24-processing.png'), fullPage: true });
    console.log('✓ 24-processing.png (AI processing)');

    // Wait for completion
    console.log('→ Waiting for AI to complete...');
    try {
      await page.waitForSelector('text=เสร็จสิ้น', { timeout: 30000 });
      console.log('  AI completed!');
    } catch {
      console.log('  Timed out — taking screenshot');
    }
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(OUT, '25-completed.png'), fullPage: true });
    console.log('✓ 25-completed.png (completed with result)');

    // ── Step 7: Open detail panel ──
    console.log('→ Opening detail panel...');
    const detailBtn = page.locator('button:has-text("รายละเอียด")').first();
    try {
      await detailBtn.waitFor({ state: 'visible', timeout: 8000 });
      await detailBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, '26-detail-with-xray.png'), fullPage: true });
      console.log('✓ 26-detail-with-xray.png (X-ray image now visible in detail panel)');
    } catch {
      console.log('  Detail button not found');
    }
  }

  await browser.close();
  console.log(`\nDone! Screenshots in: ${OUT}`);
})().catch(console.error);
