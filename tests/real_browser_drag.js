// Real-Chromium check of the drag reorder (native HTML5 DnD). Not a committed test — a one-off verification.
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, 'shots', 'out');

require('fs').mkdirSync(require('path').join(__dirname, 'shots'), { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.click('.desktop-shell [data-action="nav-workshops"]');
  await page.click('.desktop-shell [data-action="ws-manage-toggle"]');

  const order = () => page.$$eval('.desktop-shell .ws-row', (rows) => rows.map((r) => r.getAttribute('data-id')));
  console.log('initial     :', (await order()).join(' '));

  const handle = page.locator('.desktop-shell .ws-row[data-id="ws1"] [data-drag-handle]');
  const hb = await handle.boundingBox();
  const rows = await page.$$eval('.desktop-shell .ws-row', (rs) => rs.map((r) => { const b = r.getBoundingClientRect(); return { id: r.getAttribute('data-id'), top: b.top, h: b.height }; }));
  console.log('row boxes   :', JSON.stringify(rows));

  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 30, hb.y + 30, { steps: 5 });
  await page.waitForTimeout(150);
  const flags1 = await page.evaluate(() => ({
    dragging: !!document.querySelector('.desktop-shell .ws-row.dragging'),
    sorting: document.body.classList.contains('ws-sorting')
  }));
  console.log('mid-drag #1 :', JSON.stringify(flags1));
  await page.screenshot({ path: out + '_1_dragging.png' });

  // drag down past ws2 midline, then past ws3 midline
  const r2 = rows[1], r3 = rows[2];
  await page.mouse.move(hb.x + 30, r2.top + r2.h * 0.8, { steps: 10 });
  await page.waitForTimeout(350);
  console.log('after ws2   :', (await order()).join(' '));
  await page.screenshot({ path: out + '_2_after_first_move.png' });

  await page.mouse.move(hb.x + 30, r3.top + r3.h * 0.85, { steps: 10 });
  await page.waitForTimeout(350);
  console.log('after ws3   :', (await order()).join(' '));
  await page.screenshot({ path: out + '_3_at_bottom.png' });

  await page.mouse.up();
  await page.waitForTimeout(300);
  const flags2 = await page.evaluate(() => ({
    dragging: !!document.querySelector('.ws-row.dragging'),
    sorting: document.body.classList.contains('ws-sorting')
  }));
  console.log('after drop  :', (await order()).join(' '), JSON.stringify(flags2));
  await page.screenshot({ path: out + '_4_dropped.png' });
  console.log('page errors :', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
