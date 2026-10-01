// unit_compensation.js — D-124 補正純函式的表格式測試 (run: node tests/unit_compensation.js)
// 這些案例與實作無關(只描述規格),Angular 版可原樣轉成 Jasmine/Jest。
const { JSDOM } = require('jsdom');
const path = require('path');
let failed = 0;
function eq(a, b, m) { if (a === b) console.log('  ok  - ' + m); else { failed++; console.log('  FAIL- ' + m + ' (got ' + a + ', want ' + b + ')'); } }

(async () => {
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), { runScripts: 'dangerously', pretendToBeVisual: true });
  const C = dom.window.EranautComp;
  const S = 1000, MIN = 60 * S;

  console.log('displayMinutes: 每滿 1 分鐘減 1(以時間戳計算)');
  [[221, 0, 0, 221], [221, 0, 59 * S, 221], [221, 0, MIN, 220], [221, 0, 61 * S, 220], [221, 0, 5 * MIN + 59 * S, 216], [221, 1000, 500, 221]]
    .forEach(([b, st, now, want]) => eq(C.displayMinutes(b, st, now), want, `base ${b}, elapsed ${(now - st) / S}s -> ${want}`));

  console.log('submitMinutes: 零頭進位多扣 1 分鐘');
  [[221, 0, 0, 221], [221, 0, 1 * S, 220], [221, 0, 59 * S, 220], [221, 0, MIN, 220], [221, 0, 61 * S, 219], [10, 0, 9 * MIN + 1, 0]]
    .forEach(([b, st, now, want]) => eq(C.submitMinutes(b, st, now), want, `base ${b}, elapsed ${(now - st) / S}s -> ${want}`));

  console.log('時間戳計算:tick 次數不影響結果(不累加計數)');
  eq(C.displayMinutes(100, 0, 10 * MIN), 90, '中間漏掉多少次 tick,結果都只看 now - startedAt');
  eq(C.displayMinutes(100, 0, -5 * S), 100, '時鐘倒退不會變多');

  console.log('compensated / toParts');
  eq(C.compensated(0, 3 * MIN + 30 * S), 3, '已補正 3 分鐘');
  const p = C.toParts(1 * 1440 + 2 * 60 + 5);
  eq(p.d + '/' + p.h + '/' + p.m, '1/2/5', '1日2時5分');
  const z = C.toParts(59); eq(z.d + '/' + z.h + '/' + z.m, '0/0/59', '59分');

  console.log('自訂分鐘長度(測試加速用)');
  eq(C.displayMinutes(10, 0, 350, 100), 7, '100ms = 1 分鐘');

  process.exit(failed ? 1 : 0);
})();
