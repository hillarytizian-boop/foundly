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
  await page.fill('label.field:has-text("What the business does") input', "handmade candles for Nairobi homes");
  await page.fill('label.field:has-text("Business name") input', "Terracotta Supply");
  await page.click('button:has-text("Run")');
  await page.waitForFunction(() => !document.body.innerText.includes("Working…"), { timeout: 40000 });
  await page.waitForTimeout(2500);
  let t = await page.innerText("body");
  log(t.includes("Terracotta Supply") && t.includes("Completed"), "site built + task completed");
  log(t.includes("Your websites") && !t.includes("No sites yet"), "site persisted in website list");
  await page.screenshot({ path: "/home/user/foundly/shot-build.png", fullPage: true });

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
  await page.waitForTimeout(1800);
  t = await page.innerText("body");
  log(t.includes("Approved and released"), "approval accepted");

  // add an automation
  await page.click('button:has-text("+ Weekly business review")');
  await page.waitForTimeout(1800);
  t = await page.innerText("body");
  log(t.includes("Weekly business review") && t.includes("Autopilot off"), "automation created");
  await page.screenshot({ path: "/home/user/foundly/shot-run.png", fullPage: true });

  // Documents
  await page.goto(`${BASE}/workspace/docs`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  t = await page.innerText("body");
  log(t.includes("Everything Milo has produced") && (t.includes("Ready") || t.includes("Draft")), "documents page lists artefacts");

  // Integrations
  await page.goto(`${BASE}/workspace/integrations`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  t = await page.innerText("body");
  log(t.includes("Connect Milo to your tools") && t.includes("Stripe"), "integrations page renders catalogue");
  await page.click('button:has-text("Connect") >> nth=0');
  await page.waitForTimeout(1500);
  t = await page.innerText("body");
  log(/1 of \d+ connected/.test(t), "integration connect persisted");
  await page.screenshot({ path: "/home/user/foundly/shot-integrations.png", fullPage: true });

  // Home dashboard reflects work
  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  t = await page.innerText("body");
  log(/TASKS DONE|Tasks done/i.test(t), "home dashboard renders stats");
  log(/\b10 credits\b|\b12 credits\b|\b15 credits\b/.test(t), "credits loaded from profile");
  await page.screenshot({ path: "/home/user/foundly/shot-home.png", fullPage: true });

  // marketing pages
  for (const p of ["/", "/pricing"]) {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    log((await page.title()).includes("Foundly"), `marketing ${p}`);
  }

  console.log("CONSOLE_ERRORS:", errs.length ? JSON.stringify(errs.slice(0, 4)) : "none");
  console.log("TEST_EMAIL:", EMAIL);
  console.log(fails === 0 ? "ALL CHECKS PASSED" : `${fails} CHECK(S) FAILED`);
  await b.close();
})().catch((e) => { console.error("SCRIPT_ERROR:", e.message); process.exit(1); });
