import { chromium } from "playwright";
const PORT = process.env.PORT || "3000";
const BASE = `http://127.0.0.1:${PORT}`;
const KINGS = PORT === "3001";
const log = [];
const errors = [];
const say = (...a) => log.push(a.join(" "));
const b = await chromium.launch();
async function player(name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(name + ": " + e.message));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  if (KINGS) {
    const gate = page.locator(".kq-gate");
    await page.waitForTimeout(4500);
    say(name, "gate still showing after 5s:", await gate.isVisible());
    await gate.click();
    await page.waitForTimeout(700);
    await page.fill(".kq-name input", name);
    await page.locator(".kq-seal").first().click();
  } else {
    await page.waitForTimeout(3500);
    await page.fill("#explorer", name);
    await page.getByRole("button", { name: /Set out/ }).click();
  }
  await page.waitForTimeout(800);
  return page;
}
async function openBattle(page) {
  if (KINGS) {
    await page.locator(".kq-nav-btn").nth(1).click();
    await page.waitForTimeout(400);
    await page.locator(".kq-tile", { hasText: "Play online" }).click();
  } else {
    await page.getByRole("tab", { name: /More/ }).click();
    await page.waitForTimeout(300);
    await page.locator(".more-tile", { hasText: "Play online" }).click();
  }
  await page.waitForTimeout(600);
}
const text = async (page, sel) => ((await page.locator(sel).first().innerText({ timeout: 2000 }).catch(() => "")) || "").replace(/\s+/g, " ").trim();
try {
const A = await player("Ada");
const B = await player("Bola");
await openBattle(A);
say("choice screen:", await text(A, ".duel-choice"));
await A.locator(".duel-card.is-online").click();
await A.waitForTimeout(500);
const chips = A.locator(".duel-lands .duel-chip");
const pickName = (await chips.nth(3).innerText()).trim();
await chips.nth(3).click();
await A.locator(".duel-setup .duel-row").nth(0).locator(".duel-chip").nth(1).click();
await A.locator(".duel-setup .duel-row").nth(1).locator(".duel-chip").nth(1).click();
await A.locator(".duel-setup .duel-row").last().locator(".duel-chip").nth(0).click();
say("picked land:", pickName);
await A.locator(".duel-setup .duel-btn.is-main").click();
await A.waitForSelector(".duel-code", { timeout: 15000 });
const code = (await A.locator(".duel-code").innerText()).trim();
say("room code:", code, "| A lobby:", (await text(A, ".duel")).slice(0, 300));
await B.goto(`${BASE}/?room=${code}`, { waitUntil: "networkidle" });
if (KINGS) { await B.waitForTimeout(800); if (await B.locator(".kq-gate").isVisible()) await B.locator(".kq-gate").click(); }
await B.waitForSelector(".duel-what", { timeout: 15000 });
await B.waitForTimeout(1500);
say("B lobby:", await text(B, ".duel-what"), "|", await text(B, ".duel-score"));
await A.waitForTimeout(2000);
await B.locator(".duel-btn.is-main.is-wide").click();
for (let r = 0; r < 5; r++) {
  await A.waitForFunction((n) => document.querySelector(".duel-title")?.textContent?.includes(`Question ${n}`), r + 1, { timeout: 15000 });
  await B.waitForFunction((n) => document.querySelector(".duel-title")?.textContent?.includes(`Question ${n}`), r + 1, { timeout: 15000 });
  const qa = await text(A, ".duel-q");
  const qb = await text(B, ".duel-q");
  if (r === 0) say("Q1:", qa.slice(0, 90));
  if (qa !== qb) say("MISMATCH q", r, qa, "|", qb);
  await A.locator(".duel-opt").nth(r % 2 === 0 ? 0 : 1).click();
  await A.waitForTimeout(500);
  if (r === 0) say("A waiting:", await text(A, ".duel-wait"), "| B sees:", await text(B, ".duel-wait"));
  await B.locator(".duel-opt").nth(r % 3).click();
  await A.waitForSelector(".duel-verdict", { timeout: 15000 });
  await B.waitForSelector(".duel-verdict", { timeout: 15000 });
  say(`R${r + 1} A:`, await text(A, ".duel-verdict"), "| B:", await text(B, ".duel-verdict"), "| A score:", await text(A, ".duel-score"));
  if (r === 0) say("who picked:", await text(A, ".duel-opts"));
  await (r % 2 === 0 ? A : B).locator(".duel-verdict-wrap .duel-btn").click();
  await A.waitForTimeout(1200);
}
await A.waitForSelector(".duel-final-banner", { timeout: 15000 });
await B.waitForSelector(".duel-final-banner", { timeout: 15000 });
say("FINAL A:", await text(A, ".duel-final-banner"), "| B:", await text(B, ".duel-final-banner"));
say("final buttons:", await text(A, ".duel-final-actions"));
await B.locator(".duel-final-actions .duel-btn", { hasText: "Change" }).click();
await B.waitForTimeout(300);
await B.locator(".duel-setup .duel-row").nth(1).locator(".duel-chip").nth(3).click();
await B.waitForTimeout(200);
say("advanced modes shown:", await B.locator(".duel-setup .duel-row.is-wrap .duel-chip").count());
await B.locator(".duel-setup .duel-btn.is-main").click();
await A.waitForFunction(() => document.querySelector(".duel-title")?.textContent?.includes("Question 1"), null, { timeout: 15000 });
say("after change, A sees:", await text(A, ".duel-title"), "| tags:", await text(A, ".duel-tags"), "| score:", await text(A, ".duel-score"));
await A.locator(".duel-head .duel-btn").first().click();
await A.waitForTimeout(800);
say("A after leave:", (await text(A, "main")).slice(0, 80));
} catch (e) { errors.push("FAIL " + e.message.slice(0, 400)); }
console.log(JSON.stringify({ log, errors }, null, 1));
await b.close();
