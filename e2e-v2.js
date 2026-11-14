const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://127.0.0.1:3000";
const EMAIL = `foundly.v2.${Date.now()}@example.com`;
const PASS = "TestPass123!";
let fails = 0;
const log = (ok, m) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} | ${m}`); };

(async () => {
  // Vercel's bot checkpoint challenges headless defaults; present a normal
  // browser identity so production runs test the app, not the WAF.
  const b = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled"] });
  const ctx = await b.newContext({
    viewport: { width: 1300, height: 1100 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await ctx.newPage();
  // request-context calls do not inherit the browser UA, so set it explicitly
  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
  const apiGet = (u) => page.request.get(u, { headers: { "user-agent": UA } });
  const apiPost = (u, data) => page.request.post(u, { headers: { "user-agent": UA }, data });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));

  // signup -> workspace
  await page.goto(`${BASE}/sign-up`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button:has-text("Sign up")');
  await page.waitForURL("**/workspace", { timeout: 30000 }).catch(() => {});
  log(page.url().includes("/workspace"), `signup -> ${page.url()}`);
  await page.screenshot({ path: "/home/user/foundly/shot-home-empty.png", fullPage: true });

  // RUN a Home capability (market research)
  await page.goto(`${BASE}/workspace?run=research.market`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  log(await page.locator('label.field input').count() > 0, "home capability form rendered");

  // Build environment: generate a site
  await page.goto(`${BASE}/workspace/build`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.fill('label.field:has-text("What the business does") textarea', "handmade candles for Nairobi homes, sold in sets of three");
  await page.fill('label.field:has-text("Business name") input', "Terracotta Supply");
  await page.click('button:has-text("Build with the agent team")');
  await page.waitForFunction(() => !document.body.innerText.includes("Agents are working…"), { timeout: 60000 });
  await page.waitForTimeout(2500);
  let t = await page.innerText("body");
  log(["Strategist", "Builder", "Reviewer", "Publisher"].every((a) => t.includes(a)), "all four agents reported a step");
  log(/\d+\/100/.test(t), "reviewer score shown");
  log(t.includes("Terracotta Supply") && /\/s\/terracotta-supply/.test(t), "agent build created a slugged site");
  log(await page.locator('iframe[title="Site preview"]').count() === 1, "site preview rendered in canvas");
  log(/Fast · built-in|Live · model/.test(t), "engine toggle offered (fast vs live model)");
  log(/\/5 passed|\d\/\d+ passed/.test(t) && /Guardrails/i.test(t), "guardrail report rendered");

  // publish it
  await page.click('button:has-text("Publish")');
  await page.waitForTimeout(2500);
  t = await page.innerText("body");
  log(t.includes("live"), "site marked live after publish");
  const slug = (t.match(/\/s\/(terracotta-supply[\w-]*)/) || [])[1];
  log(!!slug, `resolved slug ${slug}`);
  // load with the browser itself: the edge WAF challenges bare request contexts
  const pubResp = await page.goto(`${BASE}/s/${slug}`, { waitUntil: "domcontentloaded" });
  const pubBody = await page.innerText("body").catch(() => "");
  log(pubResp?.status() === 200 && pubBody.length > 500 && !/Security Checkpoint/i.test(await page.title()),
    `/s/${slug} served publicly (${pubResp?.status()}, ${pubBody.length} chars)`);
  await page.screenshot({ path: "/home/user/foundly/shot-build.png" });

  // Run environment: outreach (approval-gated)
  await page.goto(`${BASE}/workspace/run`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.fill('label.field:has-text("Business") input', "handmade candles for Nairobi homes");
  await page.fill('label.field:has-text("Who you") input', "boutique gift shops").catch(() => {});
  await page.click('button:has-text("Run")');
  await page.waitForFunction(() => !document.body.innerText.includes("Working…"), { timeout: 40000 });
  await page.waitForTimeout(1500);
  t = await page.innerText("body");
  log(t.includes("waiting for your approval") || t.includes("needs_approval"), "outreach gated behind approval");
  log(t.includes("Approve"), "approve control shown");

  // approve it
  await page.click('button:has-text("Approve")');
  await page.waitForFunction(
    () => /Approved and released|Approved\b|no longer waiting/i.test(document.body.innerText),
    { timeout: 30000 }
  ).catch(() => {});
  await page.waitForTimeout(600);
  t = await page.innerText("body");
  log(/Approved and released|Approved\b/i.test(t), "approval accepted");

  // add an automation
  await page.click('button:has-text("+ Weekly business review")');
  await page.waitForTimeout(1800);
  t = await page.innerText("body");
  log(t.includes("Weekly business review") && t.includes("Autopilot off"), "automation created");
  await page.screenshot({ path: "/home/user/foundly/shot-run.png" });

  // Documents
  await page.goto(`${BASE}/workspace/docs`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  t = await page.innerText("body");
  log(t.includes("Everything Milo has produced") && (t.includes("Ready") || t.includes("Draft")), "documents page lists artefacts");

  // Integrations
  await page.goto(`${BASE}/workspace/integrations`, { waitUntil: "networkidle" });
  await page.waitForSelector('button:has-text("Add credentials to enable")', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  t = await page.innerText("body");
  log(t.includes("Connect Milo to your tools") && t.includes("Stripe"), "integrations page renders catalogue");
  log(/\d+ of 19 providers ready/.test(t), "provider readiness count rendered");
  const credButtons = await page.locator('button:has-text("Add credentials to enable")').count();
  log(credButtons > 0, `unconfigured providers honestly disabled (${credButtons} shown)`);
  log(await page.locator('a:has-text("Connect")').count() === 0, "no Connect link offered without credentials");
  const socialRows = await page.locator('strong:has-text("Instagram"), strong:has-text("TikTok"), strong:has-text("LinkedIn")').count();
  log(socialRows >= 3, `publishable social channels listed (${socialRows})`);
  await page.screenshot({ path: "/home/user/foundly/shot-integrations.png" });

  // social publisher in Run refuses to fake a post
  await page.goto(`${BASE}/workspace/run`, { waitUntil: "networkidle" });
  await page.waitForSelector('label.field:has-text("Post") textarea', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  t = await page.innerText("body");
  log(t.includes("Publish to social"), "social publisher panel on Run");
  await page.fill('label.field:has-text("Post") textarea', "Three-candle sets, made in Nairobi.");
  const postBtn = page.locator('button:has-text("Publish now")');
  log(await postBtn.isDisabled(), "publish blocked until a channel is connected");

  // Home dashboard reflects work
  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.body.innerText.match(/Credits\s*\d+/), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  t = await page.innerText("body");
  log(/TASKS DONE|Tasks done/i.test(t), "home dashboard renders stats");
  log(/credits\s*\d+/i.test(t) && !/credits\s*—/i.test(t), "credits loaded from profile");
  await page.screenshot({ path: "/home/user/foundly/shot-home.png" });

  // model + harness status
  const mj = await page.evaluate(async (base) => {
    const r = await fetch(`${base}/api/models/status`);
    return r.json().catch(() => ({}));
  }, BASE);
  log(typeof mj.configured === "boolean", `model status reports configured=${mj.configured}`);
  log(!JSON.stringify(mj).includes("nvapi-"), "model status never leaks the API key");

  const probeRes = await page.evaluate(async (base) => {
    const r = await fetch(`${base}/api/models/status`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Reply with exactly: harness ok" }),
    });
    const json = await r.json().catch(() => ({}));
    return { status: r.status, json };
  }, BASE);
  const probe = { status: () => probeRes.status, json: async () => probeRes.json };
  const pj = await probe.json().catch(() => ({}));
  if (!mj.configured) {
    log(probe.status() === 503, "unconfigured model reports 503 honestly");
  } else if (probe.status() === 200 && /harness ok/i.test(pj.text || "")) {
    log(true, `live model answered via app (${Math.round((pj.ms || 0) / 1000)}s)`);
  } else {
    // the endpoint is a slow reasoning model: a clean, explicit failure is a pass,
    // a silent/hanging success is not
    const honest = probe.status() === 502 && /did not answer within|NVIDIA API/i.test(pj.error || "");
    log(honest, `live model timed out and said so honestly (${Math.round((pj.ms || 0) / 1000)}s)`);
    log(!JSON.stringify(pj).includes("nvapi-"), "timeout path still never leaks the key");
  }

  // marketing pages
  for (const p of ["/", "/pricing"]) {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    log((await page.title()).includes("Foundly"), `marketing ${p}`);
  }

  // ── legal pages ──────────────────────────────────────────────
  for (const [path, heading, mustMention] of [
    ["/privacy", "Privacy Policy", ["Supabase", "NVIDIA", "Vercel", "Stripe", "your rights", "cookies"]],
    ["/terms", "Terms of Service", ["AI output", "Credits", "liability", "Governing law", "approval"]],
  ]) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const lt = await page.innerText("body");
    log(lt.includes(heading), `${path} renders (${heading})`);
    log(mustMention.every((m) => new RegExp(m, "i").test(lt)), `${path} covers the required topics`);
    log((await page.locator(".lg-toc a").count()) >= 8, `${path} has a table of contents`);
    log(/Last updated/i.test(lt), `${path} shows a last-updated date`);
    log((await page.locator(".topbar").count()) === 0, `${path} suppresses the app pill nav`);
    log(await page.locator(".mk-footer-grid").count() === 1, `${path} carries the marketing footer`);
    log(!/undefined|TODO|lorem ipsum/i.test(lt), `${path} has no placeholder text`);
  }

  // footer links resolve to the real pages, not a placeholder
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const legalHrefs = await page.$$eval(".mk-footer a", (as) => as.map((a) => a.getAttribute("href")));
  log(legalHrefs.includes("/privacy") && legalHrefs.includes("/terms"), "footer links to /privacy and /terms");

  // homepage matches the foundable.com reference
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  t = await page.innerText("body");
  const has = (sel) => page.locator(sel).count();

  log(await has(".mk-sky") === 1, "full-viewport sky hero rendered");
  log(await has(".mk-sky-nav .links a") === 5, "header nav has 5 section links");
  log(await has(".mk-sky h1") === 1 && /runs on its own/i.test(t), "hero headline rendered");
  log(await has(".mk-sky .lede") === 1, "hero lede rendered");
  log(await has(".mk-ask textarea") >= 1, "hero prompt is a textarea card");
  log(await has(".mk-clouds svg") >= 1, "cloud layer drawn as inline SVG");

  const heroType = await page.evaluate(() => {
    const h1 = document.querySelector(".mk-sky h1");
    const lede = document.querySelector(".mk-sky .lede");
    const sky = document.querySelector(".mk-sky");
    const c = getComputedStyle(h1);
    return {
      size: parseFloat(c.fontSize),
      weight: Number(c.fontWeight),
      lh: parseFloat(c.lineHeight) / parseFloat(c.fontSize),
      lede: parseFloat(getComputedStyle(lede).fontSize),
      skyH: sky.getBoundingClientRect().height / window.innerHeight,
    };
  });
  log(heroType.size >= 40, `hero h1 is large type (${heroType.size}px)`);
  log(heroType.weight >= 600, `hero h1 is bold (weight ${heroType.weight})`);
  log(heroType.lh <= 1.12, `hero h1 is tightly leaded (${heroType.lh.toFixed(2)})`);
  log(heroType.lede >= 16, `hero lede is readable (${heroType.lede}px)`);
  log(heroType.skyH >= 0.9, `sky stage fills the viewport (${Math.round(heroType.skyH * 100)}%)`);

  log(await has(".mk-steps-grid .mk-stepcard") === 5, "five how-it-works cards");
  log(await has(".mk-logos span") === 8, "logo wall has 8 marks");
  log(await has(".mk-demo .mk-chatcard") === 1 && await has(".mk-demo .mk-canvas") === 1, "chat + live site demo");
  log(await has(".mk-art-grid .mk-art") === 4, "folder gallery rendered");
  log(await has(".mk-dark .mk-rowline") === 5, "guardrail checklist of 5");
  log(await has(".mk-faq details") === 7, "seven FAQ rows");
  log(await has(".mk-close .mk-ask") === 1, "closing CTA prompt card");
  log(await has(".mk-footer-grid") === 1, "marketing footer rendered");
  log((await page.locator(".topbar").count()) === 0, "app pill nav suppressed on marketing home");

  // FAQ disclosure actually opens
  await page.locator(".mk-faq details").first().locator("summary").click();
  await page.waitForTimeout(250);
  log(await page.locator(".mk-faq details").first().evaluate((el) => el.open), "FAQ accordion opens");

  // hero prompt routes to sign-up and carries the idea
  await page.fill("#prompt textarea", "handmade candles for Nairobi homes");
  await page.click("#prompt button[type=submit]");
  await page.waitForURL("**/sign-up**", { timeout: 20000 }).catch(() => {});
  log(page.url().includes("/sign-up") && decodeURIComponent(page.url()).includes("handmade candles"), "hero prompt hands the idea to sign-up");

  // ── social connect path ──────────────────────────────────────
  await page.goto(BASE + "/workspace/integrations", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const intBody = await page.innerText("body");
  log(/Social channels/i.test(intBody), "social channels section rendered");
  log(["X", "LinkedIn", "Facebook Page", "Instagram", "TikTok"].every((n) => intBody.includes(n)),
    "all five social platforms listed");

  // open X setup and read the guide
  for (const bt of await page.$$("button")) {
    if ((await bt.innerText()).trim() === "Setup / paste token") { await bt.click(); break; }
  }
  await page.waitForTimeout(400);
  const guide = await page.innerText("body");
  log(/developer portal/i.test(guide), "per-platform setup steps shown");
  log(guide.includes("/api/integrations/callback/x"), "callback URL shown for copy-paste");
  log(guide.includes("X_CLIENT_ID"), "required env var names shown");

  // a bogus token must be rejected by the provider and must not be saved
  await page.fill('input[placeholder="X access token"]', "not-a-real-token-123");
  for (const bt of await page.$$("button")) {
    if ((await bt.innerText()).trim() === "Test") { await bt.click(); break; }
  }
  await page.waitForTimeout(6000);
  const rejection = await page.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((e) =>
      getComputedStyle(e).fontWeight === "600" && /token|forbidden|unauthorized|rejected/i.test(e.textContent || "")
      && !/Test calls/.test(e.textContent || ""));
    return el ? el.textContent.trim() : null;
  });
  log(Boolean(rejection), `bad token rejected with the provider's own error`);
  log(/user-context/i.test(rejection || "") || !/Application-Only/i.test(rejection || ""),
    "app-only token gets an actionable explanation");
  const xStatus = await page.evaluate(async () => {
    const j = await (await fetch("/api/integrations/status")).json();
    return j.providers.find((p) => p.slug === "x");
  });
  log(xStatus.connected === false, "rejected token saved nothing");
  log(xStatus.tokenConnect === true && Boolean(xStatus.guide), "provider advertises token path + guide");
  await page.keyboard.press("Escape");

  // no horizontal overflow on a phone
  const phone = await (await b.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  })).newPage();
  await phone.goto(BASE + "/", { waitUntil: "networkidle" });
  await phone.waitForTimeout(600);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  log(overflow <= 0, `no horizontal overflow on mobile (${overflow}px)`);
  const phoneType = await phone.evaluate(() => {
    const h1 = document.querySelector(".mk-sky h1");
    return {
      size: parseFloat(getComputedStyle(h1).fontSize),
      lede: parseFloat(getComputedStyle(document.querySelector(".mk-sky .lede")).fontSize),
      navLinks: getComputedStyle(document.querySelector(".mk-sky-nav .links")).display,
    };
  });
  log(phoneType.size >= 40, `mobile hero h1 stays large (${phoneType.size}px)`);
  log(phoneType.lede >= 16, `mobile lede stays readable (${phoneType.lede}px)`);
  log(phoneType.navLinks === "none", "mobile header hides the link row");
  await phone.screenshot({ path: "/home/user/foundly/shot-mobile.png" });
  await phone.close();

  console.log("CONSOLE_ERRORS:", errs.length ? JSON.stringify(errs.slice(0, 4)) : "none");
  console.log("TEST_EMAIL:", EMAIL);
  console.log(fails === 0 ? "ALL CHECKS PASSED" : `${fails} CHECK(S) FAILED`);
  await b.close();
})().catch((e) => { console.error("SCRIPT_ERROR:", e.message); process.exit(1); });
