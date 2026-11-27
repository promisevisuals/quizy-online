import { chromium } from "playwright";
const BASE = "http://127.0.0.1:3001";
const out = { gate: null, overflow: [], errors: [] };
const b = await chromium.launch();
for (const vp of [{ width: 360, height: 640 }, { width: 320, height: 568 }]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => out.errors.push(e.message));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(6000);
  if (out.gate === null) out.gate = await page.locator(".kq-gate").isVisible();
  await page.locator(".kq-gate").click();
  await page.waitForTimeout(700);
  await page.fill(".kq-name input", "Eli");
  await page.locator(".kq-seal").first().click();
  await page.waitForTimeout(900);
  // walk several lands: open first available land and play questions
  const lands = await page.locator(".kq-card").count();
  out.overflow.push({ vp: vp.width, landsFound: lands });
  for (let li = 0; li < Math.min(lands, 16); li++) {
    await page.locator(".kq-card").nth(li).click().catch(() => {});
    await page.waitForTimeout(500);
    const start = page.locator(".kq-sheet .kq-seal").first();
    if (await start.count()) await start.click().catch(() => {});
    await page.waitForTimeout(800);
    for (let q = 0; q < 12; q++) {
      if (!(await page.locator(".kq-play .kq-answer:not([disabled])").count())) break;
      const m = await page.evaluate(() => {
        const d = document.documentElement;
        const opts = [...document.querySelectorAll(".kq-play button")].filter((x) => x.scrollWidth > x.clientWidth + 2 || x.getBoundingClientRect().right > innerWidth + 1).length;
        const qEl = document.querySelector(".kq-play .kq-question h2");
        return { hScroll: d.scrollWidth > innerWidth + 1, cutOpts: opts, qLen: qEl?.textContent?.length || 0 };
      });
      if (m.hScroll || m.cutOpts) out.overflow.push({ vp: vp.width, li, q, ...m });
      await page.locator(".kq-play .kq-answer:not([disabled])").first().click();
      await page.waitForTimeout(400);
      const m2 = await page.evaluate(() => {
        const n = [...document.querySelectorAll(".kq-play button")].find((x) => /Next|Continue|Finish|See/.test(x.textContent || ""));
        if (!n) return { next: "none" };
        const r = n.getBoundingClientRect();
        return { next: r.bottom <= innerHeight + 1 && r.top >= 0 ? "visible" : "offscreen " + Math.round(r.top) + "/" + innerHeight };
      });
      if (m2.next !== "visible") out.overflow.push({ vp: vp.width, li, q, ...m2 });
      const n = page.locator(".kq-play button", { hasText: /Next|Continue|Finish|See/ }).first();
      if (await n.count()) await n.click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    if (await page.locator(".kq-gate").isVisible()) { await page.locator(".kq-gate").click(); await page.waitForTimeout(600); }
  }
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();
