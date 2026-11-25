import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BIG_R, GY, H, LEVELS, SMALL_R, loadWorld, step, type Input, type LevelDef, type World } from "./bounce.ts";

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

function flat(extra: (rows: string[][]) => void, width = 30): LevelDef {
  const rows: string[][] = Array.from({ length: H }, (_, y) => Array.from({ length: width }, (): string => (y >= GY ? "#" : " ")));
  rows[GY - 1]![2] = "S";
  extra(rows);
  return { name: "test", hint: "", rows: rows.map((r) => r.join("")) };
}

describe("Bouncy Ball", () => {
  it("every level has a start, a gate, rings, and even rows", () => {
    for (const def of LEVELS) {
      const joined = def.rows.join("");
      assert.equal(def.rows.length, H, def.name);
      assert.equal(new Set(def.rows.map((r) => r.length)).size, 1, def.name);
      assert.equal(joined.split("S").length - 1, 1, `${def.name}: one start`);
      assert.ok(joined.includes("E"), `${def.name}: a gate`);
      assert.ok(loadWorld(def).ringsLeft >= 3, `${def.name}: rings`);
    }
  });

  it("the ball falls and rests on the ground", () => {
    const w = loadWorld(flat(() => {}));
    run(w, IDLE, 1);
    assert.ok(w.ball.onGround);
    assert.ok(Math.abs(w.ball.y + w.ball.r * 0.92 - GY) < 0.02);
  });

  it("a full jump clears two tiles but not three", () => {
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
    assert.ok(rise > 2.1 && rise < 2.9, `rise ${rise}`);
  });

  it("a quick tap makes a smaller hop", () => {
    const w = loadWorld(flat(() => {}));
    run(w, IDLE, 0.5);
    const ground = w.ball.y;
    let top = ground;
    step(w, { ...IDLE, jump: true, held: true }, DT);
    for (let t = 0; t < 1; t += DT) {
      step(w, { ...IDLE, held: t < 0.08 }, DT);
      top = Math.min(top, w.ball.y);
    }
    assert.ok(ground - top < 1.8, `hop ${ground - top}`);
  });

  it("rubber bounces about four tiles high", () => {
    const w = loadWorld(flat((r) => (r[GY - 1]![2] = "R", r[GY - 2]![2] = "S")));
    let top = 99;
    for (let t = 0; t < 1.5; t += DT) {
      step(w, IDLE, DT);
      top = Math.min(top, w.ball.y + w.ball.r * 0.92);
    }
    assert.ok(GY - 1 - top > 3.6, `bounce ${GY - 1 - top}`);
  });

  it("walls stop the ball", () => {
    const w = loadWorld(flat((r) => (r[GY - 1]![8] = "#", r[GY - 2]![8] = "#", r[GY - 3]![8] = "#")));
    run(w, { ...IDLE, right: true }, 2);
    assert.ok(w.ball.x < 8);
  });

  it("collecting every ring opens the gate, and rolling into it wins", () => {
    const w = loadWorld(flat((r) => (r[GY - 1]![6] = "o", r[GY - 1]![12] = "E", r[GY - 2]![12] = "E")));
    const events = run(w, { ...IDLE, right: true }, 3);
    assert.ok(events.includes("ring"));
    assert.ok(w.won);
  });

  it("the gate stays shut until all rings are taken", () => {
    const w = loadWorld(flat((r) => (r[2]![20] = "o", r[GY - 1]![12] = "E", r[GY - 2]![12] = "E")));
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

  it("a pump makes the ball big, big balls float and small balls sink", () => {
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

  it("thorns move and hurt", () => {
    const w = loadWorld(flat((r) => (r[GY - 1]![10] = "x")));
    const events = run(w, IDLE, 25);
    assert.ok(events.includes("die"));
  });
});
