// UI regression suite for the "two different websites" fix.
// Every check here is something that was actually broken on production.
const { chromium } = require('playwright');
const B = process.env.B || 'http://127.0.0.1:3421';
const R = [];
const ok = (n, c, d = '') => R.push([c ? 'PASS' : 'FAIL', n, d]);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));

  async function signup() {
    await p.goto(B + '/sign-up', { waitUntil: 'networkidle' });
    await p.fill('input[type="email"]', `ui.${Date.now()}@example.com`);
    await p.fill('input[type="password"]', 'FoundlyQA!2345');
    await p.click('button:has-text("Sign up")');
    await p.waitForTimeout(8000);
  }
  await signup();

  const SCREENS = ['/workspace', '/workspace/build', '/workspace/run', '/workspace/docs', '/workspace/autopilot', '/workspace/integrations'];
  for (const s of SCREENS) {
    await p.goto(B + s, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1800);
    const m = await p.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      topbar: !!document.querySelector('.topbar'),
      footer: !!document.querySelector('.site-footer'),
      appTop: !!document.querySelector('.a-top'),
      app: !!document.querySelector('.app'),
      whitePanels: [...document.querySelectorAll('.app .card, .app .s-card')].filter((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        const n = bg.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/);
        if (!n) return false;
        const a = n[4] === undefined ? 1 : +n[4];
        return a > 0.5 && +n[1] > 200 && +n[2] > 200 && +n[3] > 200;
      }).length,
    }));
    ok(`${s}: no sideways scroll on a phone`, m.sw <= m.cw, `${m.sw} vs ${m.cw}`);
    ok(`${s}: no marketing pill nav`, m.topbar === false);
    ok(`${s}: no marketing footer`, m.footer === false);
    ok(`${s}: renders inside the app shell`, m.app === true && m.appTop === true);
    ok(`${s}: no white panels on the dark surface`, m.whitePanels === 0, `${m.whitePanels} found`);
  }

  // marketing keeps its own chrome — the fix must not leak
  await p.goto(B + '/pricing', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  ok('pricing keeps the marketing pill nav', await p.evaluate(() => !!document.querySelector('.topbar')));
  ok('pricing has no phone overflow', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
     String(await p.evaluate(() => document.documentElement.scrollWidth)));
  await p.goto(B + '/', { waitUntil: 'networkidle' });
  ok('home is still the marketing page', await p.evaluate(() => !document.querySelector('.a-top')));

  // the agent run must show movement instead of four idle rows
  await p.goto(B + '/workspace/build', { waitUntil: 'networkidle' });
  await p.waitForSelector('button:has-text("Build with the agent team")', { timeout: 20000 });
  await p.waitForTimeout(600);
  await p.click('button:has-text("Build with the agent team")');
  await p.waitForTimeout(500);
  ok('an empty brief is refused with a message', /tell the agents what the business does/i.test(await p.textContent('body')));

  await p.fill('textarea', 'a 3d website selling likes views and followers');
  const inputs = await p.$$('input');
  await inputs[0].fill('Smmpanel');
  await inputs[1].fill('$1');
  await inputs[2].fill('Everyone');
  await p.selectOption('select', 'premium');
  await p.click('button:has-text("Build with the agent team")');
  await p.waitForTimeout(1200);
  const running = ((await p.textContent('.rows')) || '').replace(/\s+/g, ' ');
  ok('agents report live progress while running', /…/.test(running), running.slice(0, 80));
  ok('the run shows a live seconds counter', /working…\s*\d+s/i.test(await p.textContent('body')));

  let done = '';
  for (let i = 0; i < 22; i++) {
    await p.waitForTimeout(1200);
    done = (await p.textContent('.rows')) || '';
    if ((done.match(/✓/g) || []).length >= 3) break;
  }
  ok('a fast build completes and ticks the agents off', (done.match(/✓/g) || []).length >= 3, `${(done.match(/✓/g) || []).length} ticks`);
  let hasIframe = false;
  for (let i = 0; i < 8; i++) {
    hasIframe = await p.evaluate(() => !!document.querySelector('iframe[title="Site preview"]'));
    if (hasIframe) break;
    await p.waitForTimeout(700);
  }
  ok('the built page renders in the preview iframe', hasIframe);
  ok('the site appears in Your sites', /Smmpanel/.test(await p.textContent('body')));

  // the live path must finish in seconds, not minutes, and stay on the model
  await p.goto(B + '/workspace/build', { waitUntil: 'networkidle' });
  await p.waitForSelector('textarea', { timeout: 20000 });
  await p.waitForTimeout(600);
  await p.fill('textarea', 'handmade candles for Nairobi homes, sold in sets of three');
  const ins = await p.$$('input');
  await ins[0].fill('Terracotta Supply');
  await ins[1].fill('$45 a set');
  await ins[2].fill('gift buyers');
  await p.click('button:has-text("Live · model")');
  const t0 = Date.now();
  await p.click('button:has-text("Build with the agent team")');
  let live = '';
  let secs = 0;
  for (let i = 0; i < 90; i++) {
    await p.waitForTimeout(1000);
    // Scope to the run output, not the page: the help copy below the button
    // always mentions the word "unavailable", which made this check lie.
    live = (await p.textContent('.rows')) || '';
    const btn = (await p.textContent('body')) || '';
    if (!/Agents are working/.test(btn)) { secs = Math.round((Date.now() - t0) / 1000); break; }
  }
  ok('a live build finishes in under 60s', secs > 0 && secs < 60, `${secs}s`);
  const usedModel = /via nvidia\/|nemotron|glm-\d/i.test(live);
  ok('the live build actually used the model', usedModel, (live.match(/via nvidia\/[\w.\/-]+/i) || ['no model note'])[0]);
  ok('the live build produced a page', await p.evaluate(() => !!document.querySelector('iframe[title="Site preview"]')));

  ok('no runtime page errors', errs.length === 0, errs.join(' | ').slice(0, 120));

  const fails = R.filter((r) => r[0] === 'FAIL');
  R.forEach(([s, n, d]) => console.log(`${s === 'PASS' ? 'ok  ' : 'FAIL'} ${n}${d ? '  [' + d + ']' : ''}`));
  console.log(`\n${R.length - fails.length}/${R.length} passed`);
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
