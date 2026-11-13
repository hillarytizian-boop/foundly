// Live E2E check against the deployed Foundly site
const { chromium } = require("playwright");

const BASE = process.env.BASE || "https://foundly-three.vercel.app";
const EMAIL = `foundly.e2e.${Date.now()}@example.com`;
const PASS = "TestPass123!";
const log = (ok, msg) => console.log(`${ok ? "PASS" : "FAIL"} | ${msg}`);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // 1. Home
  await page.goto(BASE, { waitUntil: "networkidle" });
  const title = await page.title();
  log(title.includes("Foundly"), `home title: ${title}`);

  // 2. Sign up
  await page.goto(`${BASE}/sign-up`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button:has-text("Sign up")');
  await page.waitForURL("**/line", { timeout: 25000 }).catch(() => {});
  log(page.url().includes("/line"), `after signup URL: ${page.url()}`);

  // 3. Chat with Milo
  await page.goto(`${BASE}/line`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="Describe your idea…"]', "I sell handmade candles in Nairobi at $15 each");
  await page.click('button:has-text("Send")');
  await page.waitForSelector("text=Milo is thinking…", { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(
    () => !document.body.innerText.includes("Milo is thinking…"),
    { timeout: 40000 }
  );
  const body = await page.innerText("body");
  log(body.includes("turn") || body.includes("Milo:"), "Milo replied in chat");
  await page.screenshot({ path: "/home/user/foundly/e2e-chat.png", fullPage: true });

  // 4. Site builder
  await page.click('button:has-text("sites")');
  await page.fill('input[placeholder="Business name (optional)"]', "Nairobi Candle Co");
  await page.fill('textarea', "handmade candles for Nairobi homes");
  await page.click('button:has-text("Build my site")');
  await page.waitForFunction(
    () => !document.body.innerText.includes("Building…"),
    { timeout: 40000 }
  );
  const sitesBody = await page.innerText("body");
  log(/Nairobi Candle Co|What we do|How it works/.test(sitesBody), "site generated + rendered");
  await page.screenshot({ path: "/home/user/foundly/e2e-sites.png", fullPage: true });

  // 5. Payments tab (expected: friendly Stripe-not-configured notice)
  await page.click('button:has-text("payments")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/home/user/foundly/e2e-payments.png", fullPage: true });

  // 6. Sign out / sign in round-trip
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/line", { timeout: 25000 }).catch(() => {});
  log(page.url().includes("/line"), `sign-in round-trip URL: ${page.url()}`);

  console.log("CONSOLE_ERRORS:", errors.length ? JSON.stringify(errors.slice(0, 5)) : "none");
  console.log("TEST_EMAIL:", EMAIL);
  await browser.close();
})().catch((e) => {
  console.error("SCRIPT_ERROR:", e.message);
  process.exit(1);
});
