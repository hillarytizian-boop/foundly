const { chromium } = require("playwright");
const BASE = "https://foundly-three.vercel.app";
const EMAIL = `foundly.e2e.${Date.now()}@example.com`;
const PASS = "TestPass123!";
const log = (ok, m) => console.log(`${ok ? "PASS" : "FAIL"} | ${m}`);

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));

  // signup
  await page.goto(`${BASE}/sign-up`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button:has-text("Sign up")');
  await page.waitForURL("**/line", { timeout: 30000 });

  // build a site, then confirm it lands in "Your sites"
  await page.click('button:has-text("Sites")');
  await page.fill('input[placeholder="Business name (optional)"]', "Nairobi Candle Co");
  await page.fill("textarea", "handmade candles for Nairobi homes");
  await page.click('button:has-text("Build my site")');
  await page.waitForFunction(() => !document.body.innerText.includes("Building…"), { timeout: 40000 });
  await page.waitForTimeout(2500);
  let txt = await page.innerText("body");
  log(txt.includes("Nairobi Candle Co") && !txt.includes("No sites yet"), "site saved + listed under Your sites");
  await page.screenshot({ path: "/home/user/foundly/e2e-sites.png", fullPage: true });

  // outreach
  await page.click('button:has-text("Outreach")');
  await page.fill('input[placeholder^="Who are you writing to"]', "local gift shops in Nairobi");
  await page.click('button:has-text("Draft outreach")');
  await page.waitForFunction(() => !document.body.innerText.includes("Drafting…"), { timeout: 40000 });
  await page.waitForTimeout(1200);
  txt = await page.innerText("body");
  log(txt.includes("Subject:") && txt.includes("Milo's notes"), "outreach draft generated");
  await page.screenshot({ path: "/home/user/foundly/e2e-outreach.png", fullPage: true });

  // social
  await page.click('button:has-text("Social")');
  await page.selectOption("select", "Instagram");
  await page.click('button:has-text("Draft 3 posts")');
  await page.waitForFunction(() => !document.body.innerText.includes("Writing…"), { timeout: 40000 });
  await page.waitForTimeout(1200);
  txt = await page.innerText("body");
  log(txt.includes("POST 1") && txt.includes("POST 3"), "3 social posts generated");
  await page.screenshot({ path: "/home/user/foundly/e2e-social.png", fullPage: true });

  // payments tab loads + checkout gives friendly notice
  await page.click('button:has-text("Payments")');
  await page.waitForTimeout(600);
  page.once("dialog", async (d) => { log(/Stripe/i.test(d.message()), `payments notice: ${d.message().slice(0, 60)}`); await d.dismiss(); });
  await page.click('button:has-text("Create checkout link")');
  await page.waitForTimeout(2500);

  console.log("PAGE_ERRORS:", errs.length ? JSON.stringify(errs.slice(0, 3)) : "none");
  console.log("TEST_EMAIL:", EMAIL);
  await b.close();
})().catch((e) => { console.error("SCRIPT_ERROR:", e.message); process.exit(1); });
