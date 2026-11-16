const { chromium } = require('playwright');
const B = 'http://127.0.0.1:3320';
const R = [];
const ok = (n, c, d = '') => R.push([c ? 'PASS' : 'FAIL', n, d]);
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0, 120)));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 120)); });

  await p.goto(B + '/sign-up', { waitUntil: 'networkidle' });
  await p.fill('input[type="email"]', `q2.${Date.now()}@example.com`);
  await p.fill('input[type="password"]', 'FoundlyQA!2345');
  await p.click('button:has-text("Sign up")');
  await p.waitForTimeout(8000);
  await p.waitForFunction(() => document.querySelector('.a-choice') || document.querySelector('.a-composer textarea'), null, { timeout: 30000 });

  // ---- chat latency ----
  await p.click('.a-choice:has-text("I have an idea")');
  await p.waitForTimeout(500);
  await p.fill('textarea[aria-label="Your idea"]', 'a candle studio in Nairobi selling sets of three');
  const t0 = Date.now();
  await p.click('button:has-text("Continue")');
  await p.waitForFunction(() => document.querySelectorAll('.a-bubble').length >= 3, null, { timeout: 60000 });
  const chatMs = Date.now() - t0;
  ok('chat reply is fast', chatMs < 8000, `${chatMs}ms`);
  const reply = await p.$$eval('.a-bubble', e => e[e.length - 1].innerText.trim());
  ok('reply is on-voice (no "go search")', !/search (google|instagram)|don't have real-time|real-time data/i.test(reply), reply.slice(0, 70));
  ok('reply has no code/html', !/<!DOCTYPE|<html|<div/i.test(reply));
  await p.screenshot({ path: '/home/user/qa2-chat.png' });

  // ---- reload keeps history (now that the stream finishes in ~1s) ----
  await p.waitForTimeout(2500);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(4000);
  ok('history survives reload', (await p.$$('.a-bubble')).length >= 2, `${(await p.$$('.a-bubble')).length} bubbles`);

  // ---- second message ----
  const n0 = (await p.$$('.a-bubble')).length;
  await p.fill('textarea[aria-label="Message Milo"]', 'What should I sell first?');
  await p.click('button[aria-label="Send"]');
  await p.waitForFunction((n) => document.querySelectorAll('.a-bubble').length >= n + 2, n0, { timeout: 60000 });
  ok('second message answered', true);
  await p.waitForFunction(() => !/Working/i.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});

  // ---- build flow + iframe ----
  await p.goto(B + '/workspace/build', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.fill('label.field:has-text("What the business does") textarea', 'handmade candles for Nairobi homes, sold in sets of three');
  await p.fill('label.field:has-text("Business name") input', 'Ember Lane');
  await p.click('button:has-text("Build with the agent team")');
  try {
    await p.waitForFunction(() => /\d+\/100/.test(document.body.innerText), null, { timeout: 180000 });
    const t = (await p.innerText('body')).replace(/\s+/g, ' ');
    ok('build scored', /\d+\/100/.test(t), (t.match(/\d+\/100/) || [''])[0]);
    ok('build slugged', /\/s\/ember-lane/.test(t));
    ok('guardrails shown', /guardrail/i.test(t));
    const iframes = await p.$$eval('iframe', els => els.map(e => ({ title: e.title, sandbox: e.getAttribute('sandbox'), len: (e.getAttribute('srcdoc')||'').length })));
    ok('preview iframe exists', iframes.length > 0, JSON.stringify(iframes));
    ok('preview iframe sandboxed', iframes.some(f => f.sandbox === ''), JSON.stringify(iframes.map(f => f.sandbox)));
  } catch (e) { ok('build completed', false, String(e).slice(0, 70)); }
  await p.screenshot({ path: '/home/user/qa2-build.png', fullPage: false });

  ok('no console/page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(R.map(([s, n, d]) => `${s} | ${n}${d ? ' — ' + d : ''}`).join('\n'));
  console.log('\nERRORS:', errs.length ? errs.slice(0, 4) : 'none');
  await b.close();
})();
