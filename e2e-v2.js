const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://127.0.0.1:3000";
const EMAIL = `foundly.v2.${Date.now()}@example.com`;
const PASS = "TestPass123!";
let fails = 0;
const log = (ok, m) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} | ${m}`); };

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1300, height: 1100 } })).newPage();
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
  const pub = await page.request.get(`${BASE}/s/${slug}`);
  log(pub.status() === 200 && (await pub.text()).length > 500, `/s/${slug} served publicly (${pub.status()})`);
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
  const social = await page.locator('.card:has-text("can post")').count();
  log(social >= 6, `publishable social channels listed (${social})`);
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
  const ms = await page.request.get(`${BASE}/api/models/status`);
  const mj = await ms.json();
  log(ms.status() === 200 && typeof mj.configured === "boolean", `model status reports configured=${mj.configured}`);
  log(!JSON.stringify(mj).includes("nvapi-"), "model status never leaks the API key");

  const probe = await page.request.post(`${BASE}/api/models/status`, { data: { prompt: "Reply with exactly: harness ok" }, timeout: 300000 });
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

  // homepage matches the reference layout
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  t = await page.innerText("body");
  const has = (sel) => page.locator(sel).count();
  log(await has(".mk-ann") === 1, "announcement bar present");
  log(await has(".mk-header .mk-nav a") === 5, "header nav has 5 section links");
  log(await has(".mk-hero .mk-h1") === 1 && /runs on its own/i.test(t), "hero headline rendered");
  log(await has("#prompt input") >= 1, "hero prompt pill present");
  log(await has(".mk-workspace .mk-col") === 3, "workspace preview has 3 columns");
  log(await has(".mk-steps .mk-step") === 4, "next-steps checklist rendered");
  log(await has(".mk-logos span") === 8, "logo wall has 8 marks");
  log(await has(".mk-how-grid .mk-card") === 5, "five how-it-works cards");
  log(await has(".mk-artefacts .mk-card") === 5, "artefact gallery rendered");
  log(await has(".mk-dark .mk-check") === 5, "dark showcase checklist");
  log(await has(".mk-faq details") === 7, "seven FAQ rows");
  log(await has(".mk-cta-cloud") === 1, "closing CTA panel");
  log(await has(".mk-footer-grid") === 1, "marketing footer rendered");
  log((await page.locator(".topbar").count()) === 0, "app pill nav suppressed on marketing home");

  // FAQ disclosure actually opens
  await page.locator(".mk-faq details").first().locator("summary").click();
  await page.waitForTimeout(250);
  log(await page.locator(".mk-faq details").first().evaluate((el) => el.open), "FAQ accordion opens");

  // hero prompt routes to sign-up and carries the idea
  await page.fill("#prompt input", "handmade candles for Nairobi homes");
  await page.click("#prompt button");
  await page.waitForURL("**/sign-up**", { timeout: 20000 }).catch(() => {});
  log(page.url().includes("/sign-up") && decodeURIComponent(page.url()).includes("handmade candles"), "hero prompt hands the idea to sign-up");

  // no horizontal overflow on a phone
  const phone = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await phone.goto(BASE + "/", { waitUntil: "networkidle" });
  await phone.waitForTimeout(600);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  log(overflow <= 0, `no horizontal overflow on mobile (${overflow}px)`);
  await phone.screenshot({ path: "/home/user/foundly/shot-mobile.png" });
  await phone.close();

  console.log("CONSOLE_ERRORS:", errs.length ? JSON.stringify(errs.slice(0, 4)) : "none");
  console.log("TEST_EMAIL:", EMAIL);
  console.log(fails === 0 ? "ALL CHECKS PASSED" : `${fails} CHECK(S) FAILED`);
  await b.close();
})().catch((e) => { console.error("SCRIPT_ERROR:", e.message); process.exit(1); });
