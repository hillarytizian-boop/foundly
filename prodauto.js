const { chromium } = require('playwright');
const B = 'https://foundly-three.vercel.app';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0,100)));
  await p.goto(B + '/sign-up', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.fill('input[type="email"]', `pauto.${Date.now()}@example.com`);
  await p.fill('input[type="password"]', 'FoundlyQA!2345');
  await p.click('button:has-text("Sign up")');
  await p.waitForTimeout(9000);
  console.log('signed up:', p.url());

  if (await p.$('.a-choice')) {
    await p.click('.a-choice:has-text("I have an idea")');
    await p.waitForTimeout(300);
    await p.fill('textarea[aria-label="Your idea"]', 'a candle studio in Nairobi selling sets of three');
    await p.click('button:has-text("Continue")');
    await p.waitForFunction(() => !document.querySelector('.a-work') && document.querySelectorAll('.a-bubble').length >= 2, null, {timeout:180000});
    await p.waitForTimeout(2500);
  }

  // the autonomy page
  await p.goto(B + '/workspace/autopilot', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const body = (await p.innerText('body')).replace(/\s+/g,' ');
  console.log('autopilot page:', /Autopilot/i.test(body), '| off by default:', /Autopilot is off/i.test(body));

  // add a goal and run a cycle
  await p.fill('input[placeholder*="first ten orders"]', 'Get the candle shop its first ten orders');
  await p.click('button:has-text("Add goal")');
  await p.waitForTimeout(3500);
  const on = (await p.innerText('body')).replace(/\s+/g,' ');
  console.log('after goal -> autopilot on:', /working on its own/i.test(on));
  console.log('goal listed:', /first ten orders/i.test(on));

  await p.click('button:has-text("Run a cycle now")');
  await p.waitForFunction(() => !/Working…/.test(document.body.innerText), null, {timeout:280000}).catch(()=>{});
  await p.waitForTimeout(3500);
  const aft = (await p.innerText('body')).replace(/\s+/g,' ');
  const m = aft.match(/Last: (.{0,110})/);
  console.log('cycle result:', m ? m[1] : 'no summary');
  console.log('run rows:', (await p.$$('.ap-run')).length);
  console.log('steps:', await p.$$eval('.ap-step .a-step-label', e => e.map(x => x.innerText)));
  console.log('errors:', errs.length ? errs : 'none');
  await p.screenshot({ path: '/home/user/autopilot-prod.png', fullPage: false });
  await b.close();
})();
