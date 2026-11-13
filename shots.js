const { chromium } = require("playwright");
const B = "https://foundly-three.vercel.app";
const E = `shot.${Date.now()}@example.com`;
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1340, height: 1150 } })).newPage();
  await p.goto(`${B}/sign-up`, { waitUntil: "networkidle" });
  await p.fill('input[type=email]', E); await p.fill('input[type=password]', "TestPass123!");
  await p.click('button:has-text("Sign up")'); await p.waitForURL("**/workspace", { timeout: 30000 });
  // run a build task
  await p.goto(`${B}/workspace/build`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  await p.fill('input[placeholder^="What the business does"]', "handmade candles for Nairobi homes");
  await p.fill('input[placeholder^="Business name"]', "Terracotta Supply");
  await p.click('button:has-text("Run")');
  await p.waitForFunction(() => !document.body.innerText.includes("Milo is working…"), { timeout: 45000 });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: "final-build.png", fullPage: true });
  // run page with approval
  await p.goto(`${B}/workspace/run`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  await p.fill('input[placeholder^="Business"]', "handmade candles for Nairobi homes");
  await p.fill('input[placeholder^="Who you"]', "boutique gift shops");
  await p.click('button:has-text("Run")');
  await p.waitForFunction(() => !document.body.innerText.includes("Milo is working…"), { timeout: 45000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: "final-run.png", fullPage: true });
  // home
  await p.goto(`${B}/workspace`, { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  await p.screenshot({ path: "final-home.png", fullPage: true });
  console.log("SHOT_EMAIL:", E);
  await b.close();
})();
