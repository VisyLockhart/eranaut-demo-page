const { chromium } = require('playwright');
const path = require('path');
require('fs').mkdirSync(require('path').join(__dirname, 'shots'), { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const errs = [];
  async function run(name, vp, touch) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push(name + ': ' + e));
    await page.addInitScript(() => { window.ERANAUT_OCR_MS = 200; });
    await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
    const sh = (n) => page.screenshot({ path: `${__dirname}/shots/upd_${name}_${n}.png` });
    const S = touch ? '.mobile-shell ' : '.desktop-shell ';
    await sh('0_overview');
    await page.click(S + '[data-action="nav-upload"]'); await sh('1_upload');
    await page.selectOption(S + '[data-role="up-ws"]', 'ws3');
    await page.setInputFiles(S + '[data-role="file-input"]', { name: 'shot.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    await sh('2_file');
    await page.click(S + '[data-action="ocr-start"]'); await page.waitForTimeout(80); await sh('3_busy');
    await page.waitForTimeout(500); await sh('4_ocr_confirm');
    await page.click(S + '[data-action="update-cancel"]');
    await page.click(S + '[data-action="up-tab"][data-tab="manual"]'); await sh('5_manual_tab');
    await page.selectOption(S + '[data-role="up-ws"]', 'ws1');
    await page.click(S + '[data-action="manual-start"]');
    await page.click(S + '[data-action="uf-add"]');
    await page.click(S + '[data-action="update-submit"]'); await sh('6_errors');
    await page.click(S + '[data-action="update-cancel"]'); await page.click(S + '[data-action="nav-overview"]');
    await page.click(S + (touch ? '.row.qe:not(.ready)' : '.table-row.qe:not(.ready)')); await sh('7_quick');
    await ctx.close();
  }
  await run('m', { width: 390, height: 844 }, true);
  await run('d', { width: 1280, height: 800 }, false);
  console.log('errors:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
