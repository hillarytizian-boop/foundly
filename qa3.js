const { chromium } = require('playwright');
const B = 'http://127.0.0.1:3338';
const R = [];
const ok = (n, c, d = '') => R.push([c ? 'PASS' : 'FAIL', n, d]);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0, 110)));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 110)); });

  const email = `q3.${Date.now()}@example.com`;
  await p.goto(B + '/sign-up', { waitUntil: 'networkidle' });
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', 'FoundlyQA!2345');
  await p.click('button:has-text("Sign up")');
  await p.waitForTimeout(8000);
  ok('sign-up → workspace', p.url().includes('/workspace'));

  // onboarding + fast chat
  await p.waitForFunction(() => document.querySelector('.a-choice') || document.querySelector('.a-composer textarea'), null, { timeout: 30000 });
  await p.click('.a-choice:has-text("I have an idea")');
  await p.waitForTimeout(400);
  await p.fill('textarea[aria-label="Your idea"]', 'a candle studio in Nairobi selling sets of three');
  const t0 = Date.now();
  await p.click('button:has-text("Continue")');
  await p.waitForFunction(() => document.querySelectorAll('.a-bubble').length >= 3, null, { timeout: 60000 });
  ok('chat first reply', true, `${Date.now() - t0}ms`);
  await p.waitForTimeout(2000);

  // reload persistence
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(4500);
  ok('history persists', (await p.$$('.a-bubble')).length >= 2, `${(await p.$$('.a-bubble')).length}`);
  ok('not re-onboarded', !(await p.$('.a-choice')));

  // second turn
  const n0 = (await p.$$('.a-bubble')).length;
  await p.fill('textarea[aria-label="Message Milo"]', 'What should I sell first?');
  await p.click('button[aria-label="Send"]');
  await p.waitForFunction((n) => document.querySelectorAll('.a-bubble').length >= n + 2, n0, { timeout: 60000 });
  ok('multi-turn works', true);
  await p.waitForTimeout(1500);

  // build + preview (wait for the list to refresh)
  await p.goto(B + '/workspace/build', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.fill('label.field:has-text("What the business does") textarea', 'handmade candles for Nairobi homes');
  await p.fill('label.field:has-text("Business name") input', 'Ember Lane');
  await p.click('button:has-text("Build with the agent team")');
  await p.waitForFunction(() => /\d+\/100/.test(document.body.innerText), null, { timeout: 180000 });
  await p.waitForTimeout(2500);
  const ifr = await p.$$eval('iframe[title="Site preview"]', els => els.map(e => ({ sandbox: e.getAttribute('sandbox'), len: (e.getAttribute('srcdoc') || '').length })));
  ok('build scored 100', /100\/100/.test(await p.innerText('body')));
  ok('preview iframe sandboxed', ifr.length > 0 && ifr[0].sandbox === '', JSON.stringify(ifr));
  ok('preview has html', ifr[0] && ifr[0].len > 1000, `${ifr[0] ? ifr[0].len : 0} chars`);

  // publish → public URL
  const pub = await p.$('button:has-text("Publish")');
  if (pub) { await pub.click(); await p.waitForTimeout(3000); }
  const slugLink = await p.$('a[href^="/s/"]');
  ok('publish produced a public link', !!slugLink, slugLink ? await slugLink.getAttribute('href') : 'none');
  if (slugLink) {
    const href = await slugLink.getAttribute('href');
    const res = await p.goto(B + href, { waitUntil: 'networkidle' });
    const html = await p.content();
    ok('public site serves', res.status() === 200, `HTTP ${res.status()}`);
    ok('public site sanitized', !/<script/i.test(html));
    await p.goBack();
  }

  // run + approve
  await p.goto(B + '/workspace/run', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.click('button:has-text("Outreach sequence")');
  await p.waitForTimeout(500);
  for (const i of await p.$$('label.field input, label.field textarea')) await i.fill('handmade candles for Nairobi homes');
  await p.click('button:has-text("Run")');
  await p.waitForFunction(() => /Approve/.test(document.body.innerText), null, { timeout: 60000 });
  ok('run created an approval task', true);
  await p.click('button:has-text("Approve")');
  await p.waitForTimeout(3000);
  ok('approve cleared the queue', /Nothing waiting/.test(await p.innerText('body')));

  // docs + download
  await p.goto(B + '/workspace/run', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.click('button:has-text("Support FAQ")');
  await p.waitForTimeout(500);
  for (const i of await p.$$('label.field input, label.field textarea')) await i.fill('handmade candles for Nairobi homes');
  await p.click('button:has-text("Run")');
  await p.waitForTimeout(6000);
  await p.goto(B + '/workspace/docs', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const docItem = await p.$('text=Support FAQ + reply macros');
  ok('docs library lists the doc', !!docItem);
  if (docItem) {
    await docItem.click();
    await p.waitForTimeout(1200);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('button:has-text("Download .md")')]);
    ok('doc downloads', !!dl, dl ? await dl.suggestedFilename() : 'none');
  }

  // integrations page
  await p.goto(B + '/workspace/integrations', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const it = await p.innerText('body');
  ok('integrations page lists providers', /connected|providers/i.test(it));
  ok('no fake connected state', /0 connected/.test(it), (it.match(/\d+ connected[^·]*/) || [''])[0]);

  // sign out
  await p.goto(B + '/workspace', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  // The back arrow shares the .a-icon-btn class, so target the menu by label.
  await p.click('.a-icon-btn[aria-label="Menu"]');
  await p.waitForTimeout(600);
  const signOut = await p.$('text=Sign out');
  ok('sign out available', !!signOut);
  if (signOut) {
    await signOut.click();
    await p.waitForTimeout(4000);
    ok('sign out works', !p.url().includes('/workspace'), p.url());
  }

  // signed-out workspace must hand off to sign-in, not fake an account
  await p.goto(B + '/workspace', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  ok('signed-out /workspace redirects to sign-in', p.url().includes('/sign-in'), p.url());
  ok('returnTo preserved', p.url().includes('returnTo'), p.url());
  const ob = (await p.innerText('body')).replace(/\s+/g, ' ');
  ok('no onboarding for strangers', !/Let's get started/.test(ob));

  // sign back in
  await p.goto(B + '/sign-in', { waitUntil: 'networkidle' });
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', 'FoundlyQA!2345');
  await p.click('button:has-text("Sign in")');
  await p.waitForTimeout(8000);
  ok('sign-in restores the account', p.url().includes('/workspace'));
  await p.waitForTimeout(4000);
  ok('history still there after re-login', (await p.$$('.a-bubble')).length >= 2, `${(await p.$$('.a-bubble')).length}`);

  ok('no console/page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(R.map(([s, n, d]) => `${s} | ${n}${d ? ' — ' + d : ''}`).join('\n'));
  console.log(`\n${R.filter(r => r[0] === 'PASS').length}/${R.length} passed`);
  console.log('ERRORS:', errs.length ? errs.slice(0, 4) : 'none');
  await b.close();
})();
