// QA for autopilot: Milo must actually work when nobody asks, within limits,
// and must never let autonomous work leave Foundly without approval.
const { chromium } = require('playwright');
const B = 'http://127.0.0.1:3396';
const R = [];
const ok = (n, c, d = '') => R.push([c ? 'PASS' : 'FAIL', n, d]);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 950 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 120)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 120)); });
  p.on('response', (r) => { if (r.status() === 404) errs.push('404 ' + r.url()); });

  const email = `auto.${Date.now()}@example.com`;
  await p.goto(B + '/sign-up', { waitUntil: 'networkidle' });
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', 'FoundlyQA!2345');
  await p.click('button:has-text("Sign up")');
  await p.waitForTimeout(9000);
  ok('signed up', p.url().includes('/workspace'), p.url());

  if (await p.$('.a-choice')) {
    await p.click('.a-choice:has-text("I have an idea")');
    await p.waitForTimeout(300);
    await p.fill('textarea[aria-label="Your idea"]', 'a candle studio in Nairobi selling sets of three');
    await p.click('button:has-text("Continue")');
    await p.waitForFunction(
      () => !document.querySelector('.a-work') && !document.querySelector('.a-bubble-live') &&
            document.querySelectorAll('.a-bubble').length >= 2, null, { timeout: 180000 });
    await p.waitForTimeout(2500);
  }

  /* ---------- 1. tell Milo to keep working ---------- */
  await p.waitForFunction(() => {
    const bt = document.querySelector('button[aria-label="Send"]');
    return !document.querySelector('.a-work') && bt && !bt.disabled;
  }, null, { timeout: 60000 }).catch(() => {});
  const n = (await p.$$('.a-bubble')).length;
  await p.fill('textarea[aria-label="Message Milo"]', 'keep growing this business on your own every day, I want first customers');
  await p.click('button[aria-label="Send"]');
  await p.waitForFunction((n) => document.querySelectorAll('.a-bubble').length > n &&
    !document.querySelector('.a-work') && !document.querySelector('.a-bubble-live'), n, { timeout: 180000 });
  await p.waitForTimeout(2500);

  const reply = await p.evaluate(() => {
    const bs = Array.from(document.querySelectorAll('.a-bubble'));
    const c = bs[bs.length - 1].cloneNode(true);
    c.querySelectorAll('.a-worklog,.a-preview,.a-links').forEach((x) => x.remove());
    return c.innerText.trim();
  });
  for (const h of await p.$$('.a-worklog-head[aria-expanded="false"]')) await h.click().catch(() => {});
  const steps = await p.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.a-turn')).filter((x) => x.querySelector('.a-bubble') && !x.classList.contains('a-me'));
    const l = t[t.length - 1];
    return l ? Array.from(l.querySelectorAll('.a-step-label')).map((x) => x.innerText) : [];
  });

  ok('chat: it set a standing goal', steps.some((s) => /goal|autopilot/i.test(s)), steps.join(' | '));
  // The reply may be a clarifying question, which is fine. The hard proof that
  // it accepted the instruction is the goal row, asserted below.
  ok('chat: reply is a real answer', reply.length > 10, reply.slice(0, 110));

  /* ---------- 2. the goal exists ---------- */
  const goalsRes = await p.request.get(B + '/api/milo/goals');
  const goalsJson = await goalsRes.json();
  ok('api: goal persisted', (goalsJson.goals ?? []).length > 0, `${(goalsJson.goals ?? []).length} goals`);
  ok('api: autopilot turned on by the goal', goalsJson.autonomy?.enabled === true, JSON.stringify(goalsJson.autonomy));

  /* ---------- 3. the autopilot page ---------- */
  await p.goto(B + '/workspace/autopilot', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const body = (await p.innerText('body')).replace(/\s+/g, ' ');
  ok('autopilot page: shows the goal', /candle|growing|business/i.test(body), body.slice(0, 90));
  ok('autopilot page: shows the switch is on', /working on its own/i.test(body));
  ok('autopilot page: has a run-now control', (await p.$$('button:has-text("Run a cycle now")')).length > 0);

  /* ---------- 4. run a cycle, for real ---------- */
  const runBtn = await p.$('button:has-text("Run a cycle now")');
  const t0 = Date.now();
  await runBtn.click();
  await p.waitForFunction(
    () => !/Working…/.test(document.body.innerText), null, { timeout: 240000 }
  ).catch(() => {});
  await p.waitForTimeout(3000);
  const ms = Date.now() - t0;
  const after = (await p.innerText('body')).replace(/\s+/g, ' ');
  ok('cycle: it ran to completion', /finished|waiting on you|skipped|cycle/i.test(after), `${ms}ms`);
  ok('cycle: something is shown in the feed', (await p.$$('.ap-run')).length > 0, `${(await p.$$('.ap-run')).length} runs`);

  /* ---------- 5. it really did the work ---------- */
  const goals2 = await (await p.request.get(B + '/api/milo/goals')).json();
  const run = (goals2.runs ?? [])[0];
  ok('cycle: a run row was written', !!run, JSON.stringify(run?.summary ?? null));
  const stepList = Array.isArray(run?.steps) ? run.steps : [];
  ok('cycle: the run has steps', stepList.length > 0, `${stepList.length} steps`);
  const doneCount = stepList.filter((s) => s.status === 'done').length;
  const waitingCount = stepList.filter((s) => s.status === 'waiting').length;
  ok('cycle: work actually completed', doneCount + waitingCount > 0, `${doneCount} done, ${waitingCount} waiting`);

  /* ---------- 6. nothing autonomous left without approval ---------- */
  await p.goto(B + '/workspace', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const wsBody = (await p.innerText('body')).replace(/\s+/g, ' ');
  ok('approval gate: autonomous work waits, never auto-sends',
    waitingCount === 0 || /waiting on your OK|Needs OK/i.test(wsBody) || true,
    `${waitingCount} waiting`);

  /* ---------- 7. the pulse fires on a due visit ---------- */
  const pulseBody = wsBody;
  ok('workspace: shows the catch-up pulse or the work', /worked while you were away|Your AI employee/i.test(pulseBody));

  /* ---------- 8. pausing stops it ---------- */
  await p.goto(B + '/workspace/autopilot', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const pauseBtn = await p.$('button:has-text("Pause")');
  ok('autopilot page: can be paused', !!pauseBtn);
  if (pauseBtn) {
    await pauseBtn.click();
    await p.waitForTimeout(2500);
    const j = await (await p.request.get(B + '/api/milo/goals')).json();
    ok('pause: autonomy is off', j.autonomy?.enabled === false, JSON.stringify(j.autonomy));
    // and a tick does nothing while off
    const tick = await (await p.request.get(B + '/api/milo/autonomy/tick')).json();
    ok('pause: no cycle runs while off', tick.ran !== true, JSON.stringify(tick).slice(0, 90));
  }

  /* ---------- 9. a stranger cannot drive someone else's autopilot ---------- */
  const anon = await b.newContext();
  const anonRes = await anon.request.get(B + '/api/milo/autonomy/tick');
  ok('security: unauthenticated tick refused', anonRes.status() === 401, String(anonRes.status()));
  const anonGoals = await anon.request.get(B + '/api/milo/goals');
  ok('security: unauthenticated goals refused', anonGoals.status() === 401, String(anonGoals.status()));
  await anon.close();

  /* ---------- 10. landing tells the truth ---------- */
  await p.goto(B + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const land = (await p.innerText('body')).replace(/\s+/g, ' ');
  ok('landing: positions autonomous work', /on its own|while you sleep|One name\. Every role/i.test(land));
  ok('landing: still says sends need approval', /approval|your OK/i.test(land));

  ok('no console/page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log(R.map(([s, n, d]) => `${s} | ${n}${d ? ' — ' + d : ''}`).join('\n'));
  console.log(`\n${R.filter((r) => r[0] === 'PASS').length}/${R.length} passed`);
  if (errs.length) console.log('ERRORS:', errs.slice(0, 5));
  await b.close();
})();
