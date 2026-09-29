// One-off real-Chromium verification: touch drag on a mobile viewport (CDP touch events) + copyright line rendering.
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, 'shots', 'out');

require('fs').mkdirSync(require('path').join(__dirname, 'shots'), { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));

  // copyright bar (mobile) before anything else
  await page.screenshot({ path: out + '_0_home.png' });
  const bar = await page.$eval('.mobile-shell .copyright-bar', (el) => ({ text: el.textContent, nameColor: getComputedStyle(el.querySelector('.copyright-name')).color, barColor: getComputedStyle(el).color }));
  console.log('mobile bar  :', JSON.stringify(bar));

  await page.tap('.mobile-shell .m-nav [data-action="nav-workshops"]');
  await page.tap('.mobile-shell [data-action="ws-manage-toggle"]');
  const order = () => page.$$eval('.mobile-shell .ws-row', (rows) => rows.map((r) => r.getAttribute('data-id')));
  console.log('initial     :', (await order()).join(' '));

  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });

  const rows = await page.$$eval('.mobile-shell .ws-row', (rs) => rs.map((r) => { const b = r.getBoundingClientRect(); return { id: r.getAttribute('data-id'), top: b.top, h: b.height }; }));
  const hb = await page.locator('.mobile-shell .ws-row[data-id="ws1"] [data-drag-handle]').boundingBox();
  console.log('row boxes   :', JSON.stringify(rows), 'handle:', JSON.stringify(hb));
  const sx = hb.x + hb.width / 2, sy = hb.y + hb.height / 2;

  await touch('touchStart', sx, sy);
  for (let i = 1; i <= 4; i++) { await touch('touchMove', sx, sy + i * 3); await page.waitForTimeout(20); }
  await page.waitForTimeout(100);
  const mid1 = await page.evaluate(() => ({
    placeholder: !!document.querySelector('.mobile-shell .ws-row.dragging'),
    ghost: !!document.querySelector('.ws-ghost'),
    sorting: document.body.classList.contains('ws-sorting'),
    scrollY: window.scrollY
  }));
  console.log('touch-down  :', JSON.stringify(mid1));
  await page.screenshot({ path: out + '_1_touch_dragging.png' });

  const r2 = rows[1], r3 = rows[2];
  for (let y = sy; y <= r2.top + r2.h * 0.8; y += 8) { await touch('touchMove', sx, y); await page.waitForTimeout(15); }
  await page.waitForTimeout(350);
  console.log('after ws2   :', (await order()).join(' '));
  for (let y = r2.top + r2.h * 0.8; y <= r3.top + r3.h * 0.85; y += 8) { await touch('touchMove', sx, y); await page.waitForTimeout(15); }
  await page.waitForTimeout(350);
  console.log('after ws3   :', (await order()).join(' '));
  await page.screenshot({ path: out + '_2_touch_bottom.png' });

  await touch('touchEnd', sx, r3.top + r3.h * 0.85);
  await page.waitForTimeout(300);
  const end = await page.evaluate(() => ({
    placeholder: !!document.querySelector('.ws-row.dragging'),
    ghost: !!document.querySelector('.ws-ghost'),
    sorting: document.body.classList.contains('ws-sorting')
  }));
  console.log('after end   :', (await order()).join(' '), JSON.stringify(end));
  await page.screenshot({ path: out + '_3_touch_done.png' });

  // ▲▼ still works by tap
  await page.tap('.mobile-shell .ws-row[data-id="ws1"] [data-action="ws-move-up"]');
  console.log('after ▲ tap :', (await order()).join(' '));

  // desktop copyright
  const d = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await d.goto('file://' + path.join(__dirname, '..', 'index.html'));
  const dt = await d.$eval('.desktop-shell .copyright-footer-d', (el) => el.innerText);
  console.log('desktop text:', JSON.stringify(dt));
  const clip = await d.locator('.desktop-shell .copyright-footer-d').boundingBox();
  await d.screenshot({ path: out + '_4_desktop_copyright.png', clip: { x: 0, y: clip.y - 20, width: 260, height: clip.height + 40 } });
  console.log('page errors :', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
