const { chromium } = require('playwright');
const B = 'http://127.0.0.1:3401';
const R = [];
const ok = (n, c, d = '') => R.push([c ? 'PASS' : 'FAIL', n, d]);
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0,110)));

  await p.goto(B + '/sign-up', { waitUntil: 'networkidle' });
  await p.fill('input[type="email"]', `x.${Date.now()}@example.com`);
  await p.fill('input[type="password"]', 'FoundlyQA!2345');
  await p.click('button:has-text("Sign up")');
  await p.waitForTimeout(9000);

  // 1. status: is X reported as configured now?
  const st = await (await p.request.get(B + '/api/integrations/status')).json();
  const x = (st.providers || []).find(p => p.slug === 'x');
  ok('x is now reported configured', x?.configured === true, JSON.stringify({ configured: x?.configured }));
  ok('x carries the paid-credits caveat', /credits/i.test(x?.caveat?.title || ''), x?.caveat?.title ?? 'none');
  ok('x is not connected yet', x?.connected === false);
  ok('other providers unaffected', (st.providers || []).some(p => p.slug === 'gmail' && p.configured === false));

  // 2. the connect page must now be the REAL oauth path, not paste or demo
  await p.goto(B + '/connect/x', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  let body = (await p.innerText('body')).replace(/\s+/g, ' ');
  ok('connect page: real OAuth, not demo', !/demo connection/i.test(body), body.slice(0, 90));
  ok('connect page: no paste-token fallback shown', !/Paste an access token/i.test(body));
  ok('connect page: shows the credits caveat', /credits/i.test(body));
  ok('connect page: offers Continue to X', /Continue to X/i.test(body));

  // 3. the OAuth start route redirects to X's own consent screen
  const resp = await p.request.get(B + '/api/integrations/start?slug=x', { maxRedirects: 0 }).catch(e => ({ status: () => -1, headers: () => ({}) }));
  const status = resp.status();
  const loc = resp.headers?.()?.location || '';
  ok('start route redirects (not an error page)', status === 307 || status === 302, String(status));
  ok('redirects to X OAuth2 authorize', /oauth2\/authorize|i\/oauth2/.test(loc), loc.slice(0, 80));
  ok('carries our client_id', loc.includes('PSE7riEguwtpuQv0MQx2KZs4t'), loc.slice(0, 140));
  ok('requests write scope', /tweet\.write/.test(decodeURIComponent(loc)));
  ok('uses PKCE', /code_challenge=/.test(loc) && /S256/.test(loc));
  ok('redirect_uri is the production callback', decodeURIComponent(loc).includes('/api/integrations/callback/x'));

  // 4. the bearer token must NOT be usable as a connection (app-only can't post)
  const badToken = await p.request.post(B + '/api/integrations/connect-token', {
    data: { slug: 'x', token: 'AAAAAAAAAAAAAAAAAAAAAL9zAQIAAAAAHv%2FIx6z7UcEOhLDd7YTmFnByqGI%3DivbRAvqEYoGZSLxrHOKntzGjrV41e8tUjO4OMkOsnZfHuMXITB' },
  });
  ok('app-only bearer is REFUSED as a connection', badToken.status() === 400, String(badToken.status()));
  const bj = await badToken.json().catch(() => ({}));
  ok('refusal explains why', /user-context|app-only|Application-Only/i.test(JSON.stringify(bj)), JSON.stringify(bj).slice(0, 130));

  // 5. integrations page shows the caveat inline
  await p.goto(B + '/workspace/integrations', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  body = (await p.innerText('body')).replace(/\s+/g, ' ');
  ok('integrations page: X shows its caveat', /paid API credits|credits depleted/i.test(body));

  ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(R.map(([s, n, d]) => `${s} | ${n}${d ? ' — ' + d : ''}`).join('\n'));
  console.log(`\n${R.filter(r => r[0] === 'PASS').length}/${R.length} passed`);
  await b.close();
})();
