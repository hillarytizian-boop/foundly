const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h] of [["ref-mobile", 390, 844], ["ref-desk", 1320, 900]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
    await p.goto("https://foundable.com/", { waitUntil: "networkidle", timeout: 60000 });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${name}.png` });
    // computed styles of the hero bits
    const info = await p.evaluate(() => {
      const g = (sel) => { const el = document.querySelector(sel); if (!el) return null; const c = getComputedStyle(el); return { fs: c.fontSize, fw: c.fontWeight, lh: c.lineHeight, ls: c.letterSpacing, color: c.color, mw: c.maxWidth, ff: c.fontFamily }; };
      return { h1: g("h1"), lede: g("h1 + p"), root: g("body") };
    });
    console.log(name, JSON.stringify(info));
    await p.close();
  }
  await b.close();
})();
