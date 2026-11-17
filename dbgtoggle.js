const { chromium } = require('playwright');
const B = 'https://foundly-three.vercel.app';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  p.on('response', async r => {
    if (r.url().includes('/api/milo/goals')) {
      console.log('API', r.request().method(), r.status(), (r.request().postData()||'').slice(0,60));
    }
  });
  await p.goto(B + '/sign-up', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.fill('input[type="email"]', `tg.${Date.now()}@example.com`);
  await p.fill('input[type="password"]', 'FoundlyQA!2345');
  await p.click('button:has-text("Sign up")');
  await p.waitForTimeout(9000);
  await p.goto(B + '/workspace/autopilot', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  console.log('before:', /Autopilot is off/i.test(await p.innerText('body')));
  await p.fill('input[placeholder*="first ten orders"]', 'Test toggle goal');
  await p.click('button:has-text("Add goal")');
  for (let i=0;i<6;i++) {
    await p.waitForTimeout(1200);
    const t = (await p.innerText('body')).replace(/\s+/g,' ');
    console.log(`t=${(i+1)*1.2}s on=${/working on its own/i.test(t)} off=${/Autopilot is off/i.test(t)}`);
  }
  const api = await (await p.request.get(B + '/api/milo/goals')).json();
  console.log('server autonomy:', JSON.stringify(api.autonomy));
  await b.close();
})();
