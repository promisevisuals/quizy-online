import { chromium } from "playwright";
import fs from "node:fs";
const long = JSON.parse(fs.readFileSync(new URL("./long.json", import.meta.url)));
const BASE = "http://127.0.0.1:3001";
const b = await chromium.launch();
const res = [];
for (const vp of [{ width: 360, height: 640 }, { width: 320, height: 568 }, { width: 390, height: 844 }]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.locator(".kq-gate").click();
  await page.waitForTimeout(600);
  await page.fill(".kq-name input", "Eli");
  await page.locator(".kq-seal").first().click();
  await page.waitForTimeout(800);
  await page.locator(".kq-card").nth(2).click();
  await page.waitForTimeout(500);
  await page.locator(".kq-sheet .kq-seal").first().click();
  await page.waitForSelector(".kq-play .kq-answer", { timeout: 10000 });
  await page.waitForTimeout(900);
  let worst = { fitsAll: 0, n: 0, hOverflow: 0, maxAnswerBottom: 0 };
  for (const q of long) {
    const m = await page.evaluate((q) => {
      const play = document.querySelector(".kq-play");
      play.classList.toggle("is-long", q.q.length > 110 || q.opts.some((o) => o.length > 42));
      document.querySelector(".kq-play .kq-question h2").textContent = q.q;
      document.querySelectorAll(".kq-play .kq-answer-text").forEach((el, i) => (el.textContent = q.opts[i] ?? ""));
      window.scrollTo(0, 0);
      const ans = [...document.querySelectorAll(".kq-play .kq-answer")];
      const last = ans[ans.length - 1].getBoundingClientRect();
      const cut = ans.filter((a) => a.scrollWidth > a.clientWidth + 2 || a.getBoundingClientRect().right > innerWidth + 1).length;
      const h2 = document.querySelector(".kq-play .kq-question h2");
      return { h: document.documentElement.scrollWidth > innerWidth + 1, cut, h2cut: h2.scrollWidth > h2.clientWidth + 2, bottom: Math.round(last.bottom), vh: innerHeight };
    }, q);
    worst.n++;
    if (m.bottom <= m.vh) worst.fitsAll++;
    if (m.h || m.cut || m.h2cut) worst.hOverflow++;
    worst.maxAnswerBottom = Math.max(worst.maxAnswerBottom, m.bottom);
  }
  // answer for real, check Next button is on screen
  await page.locator(".kq-play .kq-answer:not([disabled])").first().click();
  await page.waitForTimeout(900);
  const nx = await page.evaluate(() => {
    const n = document.querySelector(".kq-play .kq-seal.is-next");
    if (!n) return "none";
    const r = n.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight + 1 ? "visible" : `off ${Math.round(r.top)}-${Math.round(r.bottom)}/${innerHeight}`;
  });
  await page.screenshot({ path: `/tmp/fit-${vp.width}.png` });
  res.push({ vp: `${vp.width}x${vp.height}`, ...worst, nextAfterAnswer: nx });
  await ctx.close();
}
console.log(JSON.stringify(res));
await b.close();
