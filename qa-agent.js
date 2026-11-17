// QA for Milo's agent loop: talking to it must actually do things.
// Checks that a tool ran, that the work log is visible live, that the link
// works, and that the demo/mock boundary is never blurred.
const { chromium } = require('playwright');
const B = 'http://127.0.0.1:3396';
const R = [];
const ok = (n, c, d = '') => { R.push([c ? 'PASS' : 'FAIL', n, d]); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 120)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 120)); });

  const email = `agent.${Date.now()}@example.com`;
  await p.goto(B + '/sign-up', { waitUntil: 'networkidle' });
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', 'FoundlyQA!2345');
  await p.click('button:has-text("Sign up")');
  await p.waitForTimeout(8000);
  ok('signed up', p.url().includes('/workspace'), p.url());

  // onboarding
  await p.waitForFunction(() => document.querySelector('.a-choice') || document.querySelector('.a-composer textarea'), null, { timeout: 30000 });
  if (await p.$('.a-choice')) {
    await p.click('.a-choice:has-text("I have an idea")');
    await p.waitForTimeout(300);
    await p.fill('textarea[aria-label="Your idea"]', 'a candle studio in Nairobi selling sets of three');
    await p.click('button:has-text("Continue")');
    await p.waitForFunction(() => document.querySelectorAll('.a-bubble').length >= 2, null, { timeout: 90000 });
    await p.waitForTimeout(2500);
  }

  /** Send a message and wait for the turn to finish, recording what was seen. */
  async function turn(text, timeout = 150000) {
    // Wait for the composer to be idle: a still-running turn leaves Send disabled.
    await p.waitForFunction(() => {
      const bt = document.querySelector('button[aria-label="Send"]');
      return !document.querySelector('.a-work') && bt && !bt.disabled;
    }, null, { timeout: 60000 }).catch(() => {});
    const before = (await p.$$('.a-bubble')).length;
    await p.fill('textarea[aria-label="Message Milo"]', text);
    await p.waitForFunction(() => {
      const bt = document.querySelector('button[aria-label="Send"]');
      return bt && !bt.disabled;
    }, null, { timeout: 20000 });
    const t0 = Date.now();
    await p.click('button[aria-label="Send"]');
    // Wait for the turn to actually finish. `!document.querySelector('.a-work')`
    // is not enough on its own: for a moment right after send there is no work
    // block AND no new bubble, so the check passes early and the test reads a
    // half-rendered transcript. Require a settled bubble that is not the live one.
    await p.waitForFunction(
      (n) =>
        document.querySelectorAll('.a-bubble').length > n &&
        !document.querySelector('.a-work') &&
        !document.querySelector('.a-bubble-live'),
      before,
      { timeout }
    );
    // Give the trailing steps/links a beat to paint.
    await p.waitForTimeout(2000);
    // Finished turns render their work log collapsed; open every one so the
    // assertions can see the rows that really persisted.
    for (const head of await p.$$('.a-worklog-head[aria-expanded="false"]')) {
      await head.click().catch(() => {});
    }
    await p.waitForTimeout(400);
    // Read only the reply prose. The bubble also contains the work log, whose
    // header ("2 steps done") would otherwise be captured as the reply.
    const bubbles = await p.evaluate(() =>
      Array.from(document.querySelectorAll('.a-bubble')).map((b) => {
        const clone = b.cloneNode(true);
        clone.querySelectorAll('.a-worklog, .a-preview, .a-links').forEach((n) => n.remove());
        return clone.innerText.trim();
      })
    );
    // Scope the work log to the last assistant bubble: every earlier turn also
    // has one, so a page-wide query returns the whole session's history.
    const steps = await p.evaluate(() => {
      const turns = Array.from(document.querySelectorAll('.a-turn'))
        .filter((t) => t.querySelector('.a-bubble') && !t.classList.contains('a-me'));
      const last = turns[turns.length - 1];
      return last ? Array.from(last.querySelectorAll('.a-step-label')).map((x) => x.innerText) : [];
    });
    return { ms: Date.now() - t0, reply: bubbles[bubbles.length - 1] || '', steps };
  }

  /* ---------- 1. connect a tool ---------- */
  const t1 = await turn('connect my gmail so you can send emails');
  ok('connect: a tool actually ran', t1.steps.length > 0, t1.steps.join(' | '));
  ok('connect: it is a connect step', /connect/i.test(t1.steps.join(' ')), t1.steps.join(' | '));
  ok('connect: reply is prose, not a redirect', t1.reply.length > 20 && !/go to .* settings/i.test(t1.reply), t1.reply.slice(0, 100));

  // A link is not a connection. The reply must not claim otherwise.
  const claimedConnected = /(i('ve| have) (successfully )?(linked|connected)|is now connected|has been connected)/i.test(t1.reply)
    && !/not connected|when you open it|to finish|once you/i.test(t1.reply);
  ok('connect: does not claim a finished connection', !claimedConnected, t1.reply.slice(0, 120));

  const chips = await p.$$eval('.a-link-chip', (e) => e.map((x) => ({ t: x.innerText, h: x.getAttribute('href') })));
  ok('connect: a link chip appeared', chips.length > 0, JSON.stringify(chips));
  const connectHref = chips.find((c) => /connect/i.test(c.h) || /connect/i.test(c.t))?.h || '';
  ok('connect: chip points at /connect', connectHref.includes('/connect/'), connectHref);

  /* ---------- 2. the link works ---------- */
  if (connectHref) {
    const r = await p.goto(connectHref, { waitUntil: 'networkidle' });
    ok('connect page loads', r.status() === 200, String(r.status()));
    const body = (await p.innerText('body')).replace(/\s+/g, ' ');
    ok('connect page names the provider', /gmail/i.test(body));
    ok('connect page offers a real verify path', /token|Continue to/i.test(body));
    ok('connect page is not fake consenting', !/simulated|pretend granted/i.test(body) || /demo/i.test(body));
    await p.goBack({ waitUntil: 'networkidle' });
    await p.waitForTimeout(1500);
  }

  /* ---------- 3. a demo connect is labelled ---------- */
  const t2 = await turn('connect google sheets please');
  const body2 = (await p.innerText('body')).replace(/\s+/g, ' ');
  ok('demo: reply mentions demo or the link', /demo|link|connect/i.test(t2.reply), t2.reply.slice(0, 120));

  /* ---------- 4. build a site from conversation ---------- */
  const t3 = await turn('build me a landing page for Ember Lane, a candle studio in Nairobi', 240000);
  ok('build: builder step ran', t3.steps.some((s) => /build|strateg/i.test(s)), t3.steps.join(' | '));
  ok('build: reply reports a score or completion', /\d{2}\/100|built|published/i.test(t3.reply), t3.reply.slice(0, 140));

  ok('build: reply is prose, not a raw page', !/came back as a full page|That came back as code/i.test(t3.reply), t3.reply.slice(0, 90));

  const preview = await p.$('.a-preview');
  ok('build: inline preview appeared', !!preview);
  if (preview) {
    await p.click('.a-preview-head');
    await p.waitForTimeout(800);
    const frame = await p.$('.a-preview-frame');
    ok('build: preview iframe is sandboxed', frame ? (await frame.getAttribute('sandbox')) === '' : false);
  }

  const chips3 = await p.$$eval('.a-link-chip', (e) => e.map((x) => x.getAttribute('href')));
  ok('build: links out to Build', chips3.some((h) => h && h.includes('/workspace/build')), JSON.stringify(chips3));

  /* ---------- 5. status reads real data ---------- */
  const t4 = await turn('how many credits do I have left?');
  ok('status: a status step ran', t4.steps.some((s) => /account|credit|status/i.test(s)), t4.steps.join(' | '));
  ok('status: reply contains a number', /\d+/.test(t4.reply), t4.reply.slice(0, 140));

  /* ---------- 6. work log survives reload ---------- */
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(5000);
  const logHeads = await p.$$('.a-worklog-head');
  ok('reload: work log is still there', logHeads.length > 0, `${logHeads.length} logs`);
  if (logHeads.length) {
    await logHeads[0].click();
    await p.waitForTimeout(400);
    const rows = await p.$$('.a-step');
    ok('reload: the steps themselves persisted', rows.length > 0, `${rows.length} rows`);
  }

  /* ---------- 7. no fake success anywhere ---------- */
  const finalBody = (await p.innerText('body')).replace(/\s+/g, ' ');
  ok('no invented statistics', !/\b\d{2,}% of (customers|users)\b/i.test(finalBody));

  ok('no console/page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log(R.map(([s, n, d]) => `${s} | ${n}${d ? ' — ' + d : ''}`).join('\n'));
  console.log(`\n${R.filter((r) => r[0] === 'PASS').length}/${R.length} passed`);
  if (errs.length) console.log('ERRORS:', errs.slice(0, 5));
  await b.close();
})();
