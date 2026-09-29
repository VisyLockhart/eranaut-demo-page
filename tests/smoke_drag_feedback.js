// smoke_drag_feedback.js — workshop drag-reorder visual feedback (run: node smoke_drag_feedback.js)
// Verifies: full-card drag image, dashed placeholder (.dragging) applied after dragstart, NO re-render during the
// drag (source node stays connected), live DOM reorder with midline hysteresis + throttle, FLIP slide animations,
// final render on drop/dragend, ▲▼ buttons also animate, and the upload dropzone drag still works.
const { JSDOM } = require('jsdom');
const path = require('path');

let failed = 0;
function ok(cond, msg) { if (cond) console.log('  ok  - ' + msg); else { failed++; console.log('  FAIL- ' + msg); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), { runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;
  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.message));

  // --- layout stubs: jsdom has no layout, so derive rects from DOM order ---
  window.Element.prototype.getBoundingClientRect = function () {
    if (this.classList && this.classList.contains('ws-row')) {
      const idx = Array.prototype.indexOf.call(this.parentNode.querySelectorAll('.ws-row'), this);
      return { top: idx * 70, height: 60, left: 0, width: 400, bottom: idx * 70 + 60, right: 400 };
    }
    return { top: 0, height: 0, left: 0, width: 0, bottom: 0, right: 0 };
  };
  const animCalls = [];
  window.Element.prototype.animate = function (frames) { animCalls.push({ id: this.getAttribute('data-id'), frames }); return {}; };
  let fakeNow = 1000000;
  window.Date.now = () => fakeNow;

  const names = (scope) => Array.prototype.map.call(document.querySelectorAll(scope + ' .ws-row'), (r) => r.querySelector('[style*="font-weight:600"]').textContent.replace('整批提醒', '').trim());
  const click = (sel) => document.querySelector(sel).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  function dnd(type, target, clientY, dt) {
    const ev = new window.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clientX', { value: 20 });
    Object.defineProperty(ev, 'clientY', { value: clientY === undefined ? 0 : clientY });
    Object.defineProperty(ev, 'dataTransfer', { value: dt || { setData() {}, effectAllowed: '', dropEffect: '' } });
    target.dispatchEvent(ev);
    return ev;
  }
  const rowOf = (scope, id) => document.querySelector(scope + ' .ws-row[data-id="' + id + '"]');

  console.log('# enter workshop manage mode');
  click('.desktop-shell [data-action="nav-workshops"]');
  click('.desktop-shell [data-action="ws-manage-toggle"]');
  const D = '.desktop-shell';
  ok(names(D).join() === '貝殼工坊,鋼鐵之心,珊瑚礁工坊', 'initial order: ' + names(D).join(' / '));

  console.log('# dragstart');
  const ws1 = rowOf(D, 'ws1');
  const dragImageCalls = [];
  const dt = { setData() {}, effectAllowed: '', dropEffect: '', setDragImage(el, x, y) { dragImageCalls.push({ el, x, y }); } };
  dnd('dragstart', ws1.querySelector('[data-drag-handle]'), 30, dt);
  ok(dragImageCalls.length === 1 && dragImageCalls[0].el === ws1, 'drag image is the WHOLE card (.ws-row), not just the handle');
  ok(dragImageCalls[0].x === 20 && dragImageCalls[0].y === 30, 'drag image offset keeps the pointer where it grabbed the card');
  ok(!ws1.classList.contains('dragging'), 'placeholder style NOT applied yet (so the ghost is captured un-faded)');
  await sleep(10);
  ok(ws1.classList.contains('dragging'), 'after dragstart tick: dragged row gets dashed .dragging placeholder');
  ok(document.body.classList.contains('ws-sorting'), 'body gets ws-sorting (grabbing cursor)');
  ok(ws1.isConnected && rowOf(D, 'ws1') === ws1, 'source node still the same connected node (no re-render at dragstart)');

  console.log('# dragover: hysteresis + live reorder + FLIP');
  fakeNow += 500;
  const ws2 = rowOf(D, 'ws2');
  // ws2 is index 1: top 70, mid 100. Pointer above midline while dragging down -> no move yet.
  dnd('dragover', ws2, 90, dt);
  ok(names(D).join() === '貝殼工坊,鋼鐵之心,珊瑚礁工坊', 'pointer above target midline: no swap');
  animCalls.length = 0;
  dnd('dragover', ws2, 110, dt);
  ok(names(D).join() === '鋼鐵之心,貝殼工坊,珊瑚礁工坊', 'pointer past midline: dragged card moves below target -> ' + names(D).join(' / '));
  ok(rowOf(D, 'ws1') === ws1 && ws1.classList.contains('dragging'), 'dragged node preserved during live reorder (still connected, still placeholder)');
  ok(animCalls.some((c) => c.id === 'ws2' && /translateY\(70px\)/.test(c.frames[0].transform)), 'other row slides (FLIP from +70px) instead of jumping');
  // throttle: a second qualifying dragover within 100ms is ignored
  const ws3 = rowOf(D, 'ws3');
  dnd('dragover', ws3, 180, dt);
  ok(names(D).join() === '鋼鐵之心,貝殼工坊,珊瑚礁工坊', 'dragover within 100ms of previous move is throttled');
  fakeNow += 200;
  dnd('dragover', ws3, 180, dt);
  ok(names(D).join() === '鋼鐵之心,珊瑚礁工坊,貝殼工坊', 'after throttle window, moving past next row works -> ' + names(D).join(' / '));
  // no ping-pong under a still pointer
  fakeNow += 200;
  dnd('dragover', rowOf(D, 'ws3'), 100, dt);
  ok(names(D).join() === '鋼鐵之心,珊瑚礁工坊,貝殼工坊', 'no ping-pong: hovering target above its midline after moving does not swap back');
  const overEmpty = dnd('dragover', document.body, 0, dt);
  ok(overEmpty.defaultPrevented, 'dragover anywhere is accepted while sorting (no forbidden cursor)');

  console.log('# drop -> single final render');
  dnd('drop', rowOf(D, 'ws3'), 100, dt);
  await sleep(10);
  ok(!document.querySelector('.ws-row.dragging'), 'placeholder cleared after drop');
  ok(!document.body.classList.contains('ws-sorting'), 'ws-sorting cleared after drop');
  ok(names(D).join() === '鋼鐵之心,珊瑚礁工坊,貝殼工坊', 'desktop order persisted after final render');
  ok(names('.mobile-shell').join() === '鋼鐵之心,珊瑚礁工坊,貝殼工坊', 'mobile list (other shell) also reflects new order');
  const firstUp = document.querySelector(D + ' .ws-row [data-action="ws-move-up"]');
  ok(firstUp && firstUp.disabled, '▲ of the first row is disabled after final render');

  console.log('# dragend without drop still cleans up');
  fakeNow += 500;
  const wsB = rowOf(D, 'ws3');
  dnd('dragstart', wsB.querySelector('[data-drag-handle]'), 5, dt);
  await sleep(10);
  ok(wsB.classList.contains('dragging'), 'second drag shows placeholder');
  dnd('dragend', wsB, 0, dt);
  ok(!document.querySelector('.ws-row.dragging') && !document.body.classList.contains('ws-sorting'), 'dragend clears placeholder and cursor state');

  console.log('# ▲▼ buttons also animate');
  animCalls.length = 0;
  click(D + ' .ws-row[data-id="ws1"] [data-action="ws-move-up"]');
  ok(names(D).join() === '鋼鐵之心,貝殼工坊,珊瑚礁工坊', '▲ moves the row up -> ' + names(D).join(' / '));
  ok(animCalls.length >= 2, '▲▼ reorder plays slide animation (' + animCalls.length + ' rows animated)');

  console.log('# regression: upload dropzone drag');
  click(D + ' [data-action="nav-upload"]');
  const dz = document.querySelector('[data-role="dropzone-desktop"]');
  ok(!!dz, 'dropzone present on upload route');
  dnd('dragover', dz, 0, dt);
  ok(document.querySelector('[data-role="dropzone-desktop"]').classList.contains('drag'), 'dropzone highlights on file dragover (state.dragActive)');

  ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join('; ') : ''));
  console.log(failed ? '\n' + failed + ' FAILED' : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})();
