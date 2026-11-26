import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BIG_R, GY, H, LEVELS, SMALL_R, gateOpen, hurt, loadWorld, step, type Input, type LevelDef, type World } from "./bounce.ts";

const IDLE: Input = { left: false, right: false, jump: false, held: false };
const DT = 1 / 60;

function run(w: World, input: Input, seconds: number) {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += DT) {
    events.push(...step(w, input, DT));
    input = { ...input, jump: false };
  }
  return events;
}

function flat(extra: (rows: string[][]) => void, width = 30, more: Partial<LevelDef> = {}): LevelDef {
  const rows: string[][] = Array.from({ length: H }, (_, y) => Array.from({ length: width }, (): string => (y >= GY ? "#" : " ")));
  rows[GY - 1]![2] = "S";
  extra(rows);
  return { name: "test", hint: "", rows: rows.map((r) => r.join("")), world: 1, ...more };
}

describe("Bouncy Ball", () => {
  it("has three worlds of levels, each ending with a boss", () => {
    assert.ok(LEVELS.length >= 20);
    for (const wn of [1, 2, 3]) {
      const lv = LEVELS.filter((l) => l.world === wn);
      assert.ok(lv.length >= 6, `world ${wn}`);
      assert.ok(lv[lv.length - 1]!.boss, `world ${wn} ends with a boss`);
    }
  });

  it("every level has a start, a gate, rings or a boss, and even rows", () => {
    for (const def of LEVELS) {
      const joined = def.rows.join("");
      assert.equal(def.rows.length, H, def.name);
      assert.equal(new Set(def.rows.map((r) => r.length)).size, 1, def.name);
      assert.equal(joined.split("S").length - 1, 1, `${def.name}: one start`);
      assert.ok(joined.includes("E"), `${def.name}: a gate`);
      const w = loadWorld(def);
      assert.ok(def.boss ? !!w.boss : w.ringsLeft >= 3, `${def.name}: rings or boss`);
      const pBlocks = joined.split("P").length - 1;
      assert.ok((def.powers?.length ?? 0) >= pBlocks, `${def.name}: a power for every power block`);
    }
  });

  it("the ball rests on the ground", () => {
    const w = loadWorld(flat(() => {}));
    run(w, IDLE, 1);
    assert.ok(w.ball.onGround);
    assert.ok(Math.abs(w.ball.y + w.ball.r * 0.92 - GY) < 0.02);
  });

  it("a full jump clears three tiles", () => {
    const w = loadWorld(flat(() => {}));
    run(w, IDLE, 0.5);
    const ground = w.ball.y;
    let top = ground;
    step(w, { ...IDLE, jump: true, held: true }, DT);
    for (let t = 0; t < 1; t += DT) {
      step(w, { ...IDLE, held: true }, DT);
      top = Math.min(top, w.ball.y);
    }
    const rise = ground - top;
    assert.ok(rise > 3.05 && rise < 3.6, `rise ${rise}`);
  });

  it("a quick tap makes a small hop", () => {
    const w = loadWorld(flat(() => {}));
    run(w, IDLE, 0.5);
    const ground = w.ball.y;
    let top = ground;
    step(w, { ...IDLE, jump: true, held: true }, DT);
    for (let t = 0; t < 1; t += DT) {
      step(w, { ...IDLE, held: t < 0.06 }, DT);
      top = Math.min(top, w.ball.y);
    }
    assert.ok(ground - top < 1.8, `hop ${ground - top}`);
  });

  it("rubber bounces about five tiles high", () => {
    const w = loadWorld(flat((r) => ((r[GY - 1]![2] = "R"), (r[GY - 2]![2] = "S"))));
    let top = 99;
    for (let t = 0; t < 1.5; t += DT) {
      step(w, IDLE, DT);
      top = Math.min(top, w.ball.y + w.ball.r * 0.92);
    }
    assert.ok(GY - 1 - top > 4.6, `bounce ${GY - 1 - top}`);
  });

  it("collecting every ring opens the gate, and rolling into it wins", () => {
    const w = loadWorld(flat((r) => ((r[GY - 1]![6] = "o"), (r[GY - 1]![12] = "E"), (r[GY - 2]![12] = "E"))));
    const events = run(w, { ...IDLE, right: true }, 3);
    assert.ok(events.includes("ring"));
    assert.ok(w.won);
  });

  it("the gate stays shut until all rings are taken", () => {
    const w = loadWorld(flat((r) => ((r[2]![20] = "o"), (r[GY - 1]![12] = "E"), (r[GY - 2]![12] = "E"))));
    run(w, { ...IDLE, right: true }, 3);
    assert.equal(w.won, false);
    assert.ok(w.ball.x < 12);
  });

  it("spikes pop the ball and it comes back at the start", () => {
    const w = loadWorld(flat((r) => (r[GY - 1]![6] = "^")));
    const events = run(w, { ...IDLE, right: true }, 1.2);
    assert.ok(events.includes("die"));
    assert.equal(w.lives, 2);
    run(w, IDLE, 1.5);
    assert.ok(w.ball.x < 4);
  });

  it("a shield takes the hit instead, then the ball wobbles safely for a moment", () => {
    const w = loadWorld(flat(() => {}));
    w.ball.shield = true;
    const ev: string[] = [];
    hurt(w, ev as never);
    assert.deepEqual(ev, ["hurt"]);
    assert.equal(w.ball.shield, false);
    assert.equal(w.lives, 3);
    hurt(w, ev as never);
    assert.equal(w.lives, 3, "still safe while wobbling");
    w.ball.hurt = 0;
    hurt(w, ev as never);
    assert.equal(w.lives, 2);
  });

  it("fire goes first, then the shield", () => {
    const w = loadWorld(flat(() => {}));
    w.ball.shield = true;
    w.ball.fire = true;
    hurt(w, []);
    assert.equal(w.ball.fire, false);
    assert.equal(w.ball.shield, true);
  });

  it("bumping a ? block from below gives a gem; a power block drops a power-up", () => {
    const w = loadWorld(flat((r) => ((r[GY - 4]![2] = "?"), (r[GY - 4]![5] = "P")), 30, { powers: ["F"] }));
    run(w, IDLE, 0.3);
    run(w, { ...IDLE, jump: true, held: true }, 0.8);
    assert.equal(w.gems, 1);
    w.ball.x = 5.5;
    run(w, IDLE, 0.3);
    run(w, { ...IDLE, jump: true, held: true }, 0.8);
    const power = w.items.find((i) => i.kind === "F");
    assert.ok(power, "the fire power came out");
    run(w, IDLE, 1.5);
    w.ball.x = power!.x;
    run(w, IDLE, 0.2);
    assert.ok(w.ball.fire, "picked up fire");
  });

  it("jumping on a bug squashes it; walking into one hurts", () => {
    const w = loadWorld(flat((r) => (r[GY - 1]![8] = "b")));
    w.enemies[0]!.vx = 0;
    run(w, IDLE, 0.3);
    w.ball.x = 8.5;
    w.ball.y = GY - 4;
    const events = run(w, IDLE, 1);
    assert.ok(events.includes("stomp"));
    assert.equal(w.enemies[0]!.alive, false);
    const w2 = loadWorld(flat((r) => (r[GY - 1]![8] = "b")));
    const ev2 = run(w2, { ...IDLE, right: true }, 2);
    assert.ok(ev2.includes("die"));
  });

  it("fireballs burn thorns", () => {
    const w = loadWorld(flat((r) => (r[GY - 1]![10] = "x")));
    w.enemies[0]!.vx = 0;
    w.ball.fire = true;
    run(w, IDLE, 0.3);
    const events = run(w, { ...IDLE, fire: true }, 1);
    assert.ok(events.includes("fire"));
    assert.ok(events.includes("burn"));
  });

  it("big balls float and small balls sink", () => {
    const pool = (r: string[][]) => {
      r[GY - 1]![5] = "+";
      for (let x = 8; x < 20; x++) for (let y = GY; y < H; y++) r[y]![x] = "~";
    };
    const big = loadWorld(flat(pool));
    run(big, { ...IDLE, right: true }, 1.6);
    assert.equal(big.ball.r, BIG_R);
    run(big, IDLE, 2);
    assert.ok(big.ball.y < GY + 0.6, `big ball floats at ${big.ball.y}`);
    const small = loadWorld(flat((r) => { for (let x = 8; x < 20; x++) for (let y = GY; y < H; y++) r[y]![x] = "~"; }));
    run(small, { ...IDLE, right: true }, 1.2);
    run(small, IDLE, 3);
    assert.equal(small.ball.r, SMALL_R);
    assert.ok(small.ball.y > GY + 1 || small.lives < 3);
  });

  it("lava is the end of a life, even with a shield", () => {
    const w = loadWorld(flat((r) => { for (let x = 6; x < 12; x++) { r[GY]![x] = " "; r[GY + 1]![x] = "="; r[GY + 2]![x] = "="; } }));
    w.ball.shield = true;
    const events = run(w, { ...IDLE, right: true }, 2);
    assert.ok(events.includes("die"));
  });

  it("crumbling blocks fall away after you land, then come back", () => {
    const w = loadWorld(flat((r) => { for (let x = 1; x < 5; x++) { r[GY]![x] = "c"; r[GY + 1]![x] = " "; r[GY + 2]![x] = " "; } }));
    const events = run(w, IDLE, 1.2);
    assert.ok(events.includes("crumble"));
    assert.ok(w.lives < 3 || w.ball.y > GY, "fell through");
  });

  it("a boss takes hits from above, and the gate opens when it is beaten", () => {
    const w = loadWorld(LEVELS.find((l) => l.boss)!);
    const k = w.boss!;
    assert.ok(k.hp >= 3);
    assert.equal(gateOpen(w), false);
    for (let i = 0; i < k.max * 3 && !k.dead; i++) {
      run(w, IDLE, 1.3);
      w.ball.x = k.x;
      w.ball.y = k.y - k.h / 2 - 1.2;
      w.ball.vy = 4;
      k.spikes = false;
      run(w, IDLE, 0.4);
    }
    assert.ok(k.dead, `boss hp ${k.hp}`);
    assert.ok(gateOpen(w));
  });
});
