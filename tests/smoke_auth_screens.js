// smoke_auth_screens.js — 登入失敗畫面 (D-123 / D-142 login_error 代碼) (run: node tests/smoke_auth_screens.js)
const { JSDOM } = require('jsdom');
const path = require('path');
let failed = 0;
function ok(c, m) { if (c) console.log('  ok  - ' + m); else { failed++; console.log('  FAIL- ' + m); } }

(async () => {
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), { runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom; const { document } = window;
  const errors = []; window.addEventListener('error', (e) => errors.push(e.message));
  const click = (sel) => { const el = document.querySelector(sel); if (!el) throw new Error('missing ' + sel); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
  const dev = (st) => { click('[data-action="dev-toggle"]'); click('[data-action="dev-auth"][data-state="' + st + '"]'); };

  const cases = [
    ['denied', /登入未完成/, /取消了 Discord 授權/],
    ['not_in_guild', /還不是 XX 的成員/, /不在該伺服器內/],
    ['no_role', /尚未具備使用資格/, /所需的身份組/]
  ];
  for (const [st, title, desc] of cases) {
    console.log(st);
    dev(st);
    for (const shell of ['.mobile-shell ', '.desktop-shell ']) {
      const t = document.querySelector(shell + '.auth-card-title');
      ok(!!t && title.test(t.textContent), shell.trim() + ' title');
      ok(desc.test(document.querySelector(shell + '.auth-card-desc').textContent), shell.trim() + ' desc');
      ok(!!document.querySelector(shell + '[data-action="auth-retry"]'), shell.trim() + ' retry button');
    }
    ok(!/請聯絡伺服器管理員/.test(document.querySelector('.auth-card').textContent), 'no "請聯絡伺服器管理員" (D-123)');
  }
  click('[data-action="auth-retry"]');
  ok(!!document.querySelector('.discord-btn'), 'retry returns to landing');
  ok(errors.length === 0, 'no script errors ' + errors.join('|'));
  process.exit(failed ? 1 : 0);
})();
