import { chromium } from "playwright";
const BASE = "http://127.0.0.1:3000";
const log = [], errors = [];
const say = (...a) => log.push(a.join(" "));
const b = await chromium.launch();
const pages = {};
async function phone(name, other) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.exposeBinding("__bt", async (_src, kind, payload) => {
    const deliver = (p, ev) => p.evaluate((raw) => window.QuizyBluetoothEvent && window.QuizyBluetoothEvent(raw), JSON.stringify(ev));
    if (kind === "send") await deliver(pages[other], { event: "message", data: { payload } });
    if (kind === "connect") { await deliver(pages[name], { event: "connected", data: { device: other } }); await deliver(pages[other], { event: "connected", data: { device: name } }); }
    if (kind === "host") await deliver(pages[name], { event: "host_waiting", data: {} });
  });
  await ctx.addInitScript((otherName) => {
    window.QuizyBluetooth = {
      isAvailable: () => true,
      state: () => JSON.stringify({ supported: true, permission: true, enabled: true, version: 3 }),
      pairedDevices: () => JSON.stringify([{ name: otherName, address: "AA:BB" }]),
      host: () => window.__bt("host", ""),
      connect: () => window.__bt("connect", ""),
      send: (p) => window.__bt("send", p),
      requestPermission: () => {},
      openSettings: () => {},
      disconnect: () => {},
    };
  }, other);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(name + ": " + e.message));
  pages[name] = page;
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(3600);
  await page.fill("#explorer", name);
  await page.getByRole("button", { name: /Set out/ }).click();
  await page.waitForTimeout(700);
  await page.getByRole("tab", { name: /More/ }).click();
  await page.locator(".more-tile", { hasText: "Play online" }).click();
  await page.waitForTimeout(500);
  await page.locator(".duel-card.is-bt").click();
  await page.waitForTimeout(500);
  return page;
}
const text = async (page, sel) => ((await page.locator(sel).first().innerText({ timeout: 2000 }).catch(() => "")) || "").replace(/\s+/g, " ").trim();
try {
const A = await phone("Tunde", "Ngozi");
const B = await phone("Ngozi", "Tunde");
say("A screen:", (await text(A, ".duel")).slice(0, 400));
await A.locator(".duel-btn", { hasText: "Host on this phone" }).click();
await A.waitForTimeout(300);
say("A note:", await text(A, ".duel-note.is-live"));
await B.locator(".duel-btn", { hasText: "Join Tunde" }).click();
await A.waitForTimeout(600);
say("A title:", await text(A, ".duel-title"), "| B title:", await text(B, ".duel-title"));
await A.locator(".duel-setup .duel-row").last().locator(".duel-chip").nth(0).click();
await A.locator(".duel-setup .duel-btn.is-main").click();
await B.waitForSelector(".duel-q", { timeout: 5000 });
await A.waitForTimeout(300);
if (!(await A.locator(".duel-q").count())) { say("A in lobby after setup; pressing Start:", (await text(A, ".duel")).slice(0,200)); await A.locator(".duel-btn.is-main.is-wide").click(); }
for (let r = 0; r < 5; r++) {
  await A.waitForSelector(".duel-q", { timeout: 5000 });
  const qa = await text(A, ".duel-q"), qb = await text(B, ".duel-q");
  if (qa !== qb) say("MISMATCH", r, qa, "|", qb);
  await A.locator(".duel-opt").nth(0).click();
  await B.locator(".duel-opt").nth(1).click();
  await A.waitForSelector(".duel-verdict", { timeout: 5000 });
  await B.waitForSelector(".duel-verdict", { timeout: 5000 });
  say(`R${r + 1}`, await text(A, ".duel-verdict"), "|", await text(B, ".duel-verdict"));
  await (r % 2 ? B : A).locator(".duel-verdict-wrap .duel-btn").click();
  await A.waitForTimeout(300);
}
say("FINAL A:", await text(A, ".duel-final-banner"), "| B:", await text(B, ".duel-final-banner"));
await B.locator(".duel-final-actions .duel-btn", { hasText: "Play again" }).click();
await A.waitForTimeout(400);
say("after Play again A:", await text(A, ".duel-title"), "|", await text(A, ".duel-score"));
} catch (e) { errors.push("FAIL " + e.message.slice(0, 400)); }
console.log(JSON.stringify({ log, errors }, null, 1));
await b.close();
