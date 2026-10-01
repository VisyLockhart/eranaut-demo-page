// smoke_update_flow.js — 更新潛艇 flow (run: node smoke_update_flow.js)
const { JSDOM } = require('jsdom');
const path = require('path');
let failed = 0;
function ok(c, m) { if (c) console.log('  ok  - ' + m); else { failed++; console.log('  FAIL- ' + m); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) { w.ERANAUT_OCR_MS = 30; w.ERANAUT_MIN_MS = 100; w.ERANAUT_TICK_MS = 10; }
  });
  const { window } = dom; const { document } = window;
  const errors = []; window.addEventListener('error', (e) => errors.push(e.message));
  const M = '.mobile-shell ';
  const click = (sel) => { const el = document.querySelector(sel); if (!el) throw new Error('missing ' + sel); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
  const type = (el, v) => { el.value = v; el.dispatchEvent(new window.Event('input', { bubbles: true })); };

  console.log('sort order');
  let subs = [...document.querySelectorAll(M + '.row .row-sub')].map((e) => e.textContent);
  ok(subs[0] === '深海一號' || subs[0] === '探索號-3', 'ready subs first: ' + subs.slice(0, 2).join(','));
  ok(subs.indexOf('潛水艇-1') < subs.indexOf('探索號-1') && subs.indexOf('探索號-1') < subs.indexOf('潛水艇-2'), '12分 < 2時14分 < 3時50分');
  ok(/深海一號/.test(document.querySelector('.desktop-shell .d-stat.wide').textContent), 'fastest = first sorted item (dynamic)');

  console.log('upload page + tabs');
  click(M + '[data-action="nav-upload"]');
  ok(!!document.querySelector(M + '.up-tabs'), 'tabs rendered');
  ok(document.querySelectorAll(M + '[data-role="up-ws"] option').length === 3, 'ws select has 3 options');
  ok(!document.querySelector(M + '[data-action="ocr-start"]'), 'no 開始辨識 before file');

  console.log('manual flow (珊瑚礁)');
  const sel = document.querySelector(M + '[data-role="up-ws"]');
  sel.value = 'ws3'; sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  click(M + '[data-action="up-tab"][data-tab="manual"]');
  click(M + '[data-action="manual-start"]');
  ok(document.querySelectorAll(M + '.uf-row').length === 4, '4 rows for full workshop');
  ok(!document.querySelector(M + '[data-action="uf-add"]'), 'no add-row when full (MAX 4)');
  // submit empty -> errors
  click(M + '[data-action="update-submit"]');
  ok(document.querySelectorAll(M + '.uf-err').length === 4, 'validation errors on all 4 blank rows');
  const rows = () => [...document.querySelectorAll(M + '.uf-row')];
  const fill = (i, d, h, m) => {
    const r = rows()[i];
    type(r.querySelector('[data-uf-field="d"]'), d); type(r.querySelector('[data-uf-field="h"]'), h); type(r.querySelector('[data-uf-field="m"]'), m);
  };
  fill(0, '0', '0', '5'); fill(1, '0', '1', '30'); fill(2, '0', '24', '0'); fill(3, '0', '0', '0');
  ok(/預計返航 \d\d\/\d\d \d\d:\d\d/.test(rows()[0].querySelector('[data-uf-eta]').textContent), 'ETA shown live after fill');
  click(M + '[data-action="update-submit"]');
  ok(/最多 23/.test(rows()[2].textContent), '24 時 rejected');
  ok(/不能是 0/.test(rows()[3].textContent), 'total 0 rejected');
  // typing non-digits stripped
  const hin = rows()[2].querySelector('[data-uf-field="h"]'); type(hin, '2a'); ok(hin.value === '2', 'non-digits stripped');
  fill(2, '0', '2', '10');
  // set row 3 to ready
  click(M + '.uf-row[data-uf-row="3"] [data-action="uf-status"][data-status="ready"]');
  ok(!rows()[3].querySelector('[data-uf-field="d"]'), 'ready row hides time inputs');
  // values survive re-render
  ok(rows()[0].querySelector('[data-uf-field="m"]').value === '5', 'typed values survive re-render');
  click(M + '[data-action="update-submit"]');
  ok(document.querySelector(M + '.pager-label').textContent === '珊瑚礁工坊', 'back to overview on that workshop tab');
  const after = [...document.querySelectorAll(M + '.row')].map((r) => r.querySelector('.row-sub').textContent + '|' + r.querySelector('.row-time').textContent);
  ok(after[0].indexOf('潛水艇-4|可收艇') === 0, 'ready sub sorted first: ' + after[0]);
  ok(after[1] === '潛水艇-1|5 分', 'next: 5 分 -> ' + after[1]);
  ok(after[2] === '潛水艇-2|1 時 30 分', '1時30分 -> ' + after[2]);
  ok(after[3] === '潛水艇-3|2 時 10 分', '2時10分 -> ' + after[3]);
  await sleep(20);
  ok(document.querySelectorAll('.toast').length === 1, 'toast shown');
  ok(document.querySelector('.desktop-shell .d-stat.ready .num').textContent === '3', 'ready count updated (3)');

  console.log('OCR flow + flagged field (貝殼工坊)');
  click(M + '[data-action="nav-upload"]');
  const sel2 = document.querySelector(M + '[data-role="up-ws"]'); sel2.value = 'ws1'; sel2.dispatchEvent(new window.Event('change', { bubbles: true }));
  click(M + '[data-action="up-tab"][data-tab="ocr"]');
  const fi = document.querySelector(M + '[data-role="file-input"]');
  Object.defineProperty(fi, 'files', { value: [{ name: 'shot.png' }] }); fi.dispatchEvent(new window.Event('change', { bubbles: true }));
  click(M + '[data-action="ocr-start"]');
  ok(!!document.querySelector(M + '.ocr-busy'), 'busy spinner');
  await sleep(80);
  ok(document.querySelectorAll(M + '.uf-row').length === 2, 'OCR rows (2 subs in 貝殼工坊)');
  ok(document.querySelectorAll(M + '.uf-flag-msg').length === 1, 'exactly one flagged field');
  const flagRow = document.querySelector(M + '.uf-num.flagged').closest('.uf-row');
  ok(flagRow.getAttribute('data-uf-row') === '1', 'flag on row 2 (exploring)');
  type(document.querySelector(M + '.uf-num.flagged input'), '9');
  ok(document.querySelectorAll(M + '.uf-flag-msg, ' + M + '.uf-num.flagged').length === 0, 'flag cleared after editing minutes');
  console.log('D-124 per-minute compensation (1 minute = 100ms in test)');
  const f0 = (r, f) => document.querySelector(M + '.uf-row[data-uf-row="' + r + '"] [data-uf-field="' + f + '"]');
  const minsOf = (r) => (+f0(r, 'd').value) * 1440 + (+f0(r, 'h').value) * 60 + (+f0(r, 'm').value);
  // row 1 is being edited (typed 9 in minutes, field not left) -> paused; row 0 keeps compensating
  const before0 = minsOf(0);
  await sleep(260);
  ok(minsOf(0) <= before0 - 2, 'untouched row compensated by elapsed minutes (' + before0 + ' -> ' + minsOf(0) + ')');
  ok(f0(1, 'm').value === '9', 'row being edited is paused (value untouched)');
  ok(document.querySelector('.desktop-shell .uf-row[data-uf-row="0"] [data-uf-field="m"]').value === f0(0, 'm').value, 'compensation updates the desktop copy too (both shells live in the DOM)');
  ok(!!document.querySelector(M + '.uf-comp'), 'compensation hint shown');
  ok(/已依等待時間自動補正 \d+ 分鐘/.test(document.querySelector(M + '.uf-comp').textContent), 'hint text');
  // leaving the field resumes compensation from the current value
  const fm = f0(1, 'm'); fm.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
  await sleep(230);
  ok(minsOf(1) < 2 * 60 + 9, 'edited row resumes compensating after leaving the field (' + minsOf(1) + ')');
  // a row reaching 0 voids the data with a notice
  type(f0(0, 'd'), '0'); type(f0(0, 'h'), '0'); type(f0(0, 'm'), '1');
  f0(0, 'm').dispatchEvent(new window.FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
  await sleep(300);
  ok(!!document.querySelector(M + '.up-tabs') && !document.querySelector(M + '.uf-row'), 'row reaching 0 voids the form and returns to upload');
  ok([...document.querySelectorAll('.toast')].some((e) => /作廢/.test(e.textContent)), 'void notice shown');
  click(M + '[data-action="up-tab"][data-tab="manual"]'); click(M + '[data-action="manual-start"]');
  click(M + '[data-action="update-cancel"]');
  ok(!!document.querySelector(M + '.up-tabs'), 'cancel returns to upload page');

  console.log('add row (empty-ish: 貝殼工坊 has 2)');
  click(M + '[data-action="up-tab"][data-tab="manual"]'); click(M + '[data-action="manual-start"]');
  click(M + '[data-action="uf-add"]'); click(M + '[data-action="uf-add"]');
  ok(rows().length === 4, 'added to 4 rows');
  ok(rows()[3].querySelector('.uf-name').value === '潛水艇-4', 'added row named 潛水艇-4');
  click(M + '.uf-row[data-uf-row="3"] [data-action="uf-remove"]');
  ok(rows().length === 3, 'added row removable');
  click(M + '[data-action="update-cancel"]');

  console.log('quick edit');
  click(M + '[data-action="nav-overview"]');
  click(M + '.row.qe:not(.ready)');
  ok(!!document.querySelector('.modal-box .uf-row'), 'quick modal opens');
  click('.modal-box [data-action="update-submit"]');
  ok(!!document.querySelector('.modal-box .uf-err'), 'quick validates blank times (opened blank)');
  click('.modal-box [data-action="modal-cancel"]');
  ok(!document.querySelector('.modal-box'), 'quick cancel closes');
  click(M + '.row.qe:not(.ready)');
  const q = document.querySelector('.modal-box .uf-row');
  if (!q.querySelector('[data-uf-field="d"]')) click('.modal-box [data-action="uf-status"][data-status="exploring"]');
  const qr = document.querySelector('.modal-box .uf-row');
  type(qr.querySelector('[data-uf-field="d"]'), '0'); type(qr.querySelector('[data-uf-field="h"]'), '0'); type(qr.querySelector('[data-uf-field="m"]'), '59');
  click('.modal-box [data-action="update-submit"]');
  ok(!document.querySelector('.modal-box'), 'quick submit closes modal');
  ok([...document.querySelectorAll(M + '.row-time')].some((e) => e.textContent === '59 分'), 'quick edit applied (59 分)');

  console.log('desktop upload/update render');
  click('.desktop-shell [data-action="nav-upload"]');
  ok(!!document.querySelector('.desktop-shell .up-tabs'), 'desktop tabs');
  ok(errors.length === 0, 'no script errors ' + errors.join('|'));
  console.log(failed ? '\nFAILED: ' + failed : '\nALL PASS');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
