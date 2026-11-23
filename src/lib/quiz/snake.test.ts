import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GRID, judge, layTiles, spawnSnake, step, wordFor } from "./snake.ts";

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 1831565813) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("Word Snake rules", () => {
  it("wraps around the edges instead of crashing", () => {
    assert.deepEqual(step({ x: 0, y: 5 }, "left"), { x: GRID - 1, y: 5 });
    assert.deepEqual(step({ x: 4, y: GRID - 1 }, "down"), { x: 4, y: 0 });
  });

  it("lays every letter of the word plus decoys, never on the snake or touching each other", () => {
    const snake = spawnSnake();
    for (let seed = 1; seed < 40; seed++) {
      const tiles = layTiles("GIRAFFE", 9, snake, mulberry(seed));
      assert.equal(tiles.length, 16);
      assert.equal(tiles.slice(0, 7).map((t) => t.letter).join(""), "GIRAFFE");
      for (const t of tiles.slice(7)) assert.ok(!"GIRAFFE".includes(t.letter), "decoys are never word letters");
      for (const t of tiles) assert.ok(!snake.some((c) => c.x === t.x && c.y === t.y));
      const keys = new Set(tiles.map((t) => `${t.x},${t.y}`));
      assert.equal(keys.size, tiles.length);
    }
  });

  it("accepts letters only in order", () => {
    const tiles = [
      { x: 5, y: 5, letter: "C", id: 1 },
      { x: 6, y: 5, letter: "A", id: 2 },
      { x: 7, y: 5, letter: "Q", id: 3 },
    ];
    const body = [{ x: 4, y: 5 }];
    assert.equal(judge({ x: 5, y: 5 }, body, tiles, "CAT", 0).kind, "good");
    const early = judge({ x: 6, y: 5 }, body, tiles, "CAT", 0);
    assert.equal(early.kind, "wrong");
    assert.equal(early.kind === "wrong" && early.reason, "out-of-order");
    const decoy = judge({ x: 7, y: 5 }, body, tiles, "CAT", 1);
    assert.equal(decoy.kind === "wrong" && decoy.reason, "not-in-word");
    const last = judge({ x: 5, y: 5 }, body, tiles, "CAT", 0);
    assert.equal(last.kind === "good" && last.done, false);
  });

  it("counts a repeated letter in either spot", () => {
    const tiles = [
      { x: 1, y: 1, letter: "E", id: 1 },
      { x: 2, y: 1, letter: "E", id: 2 },
    ];
    const bite = judge({ x: 2, y: 1 }, [{ x: 9, y: 9 }], tiles, "BEE", 1);
    assert.equal(bite.kind, "good");
  });

  it("detects the snake biting itself but lets the head follow the tail", () => {
    const body = [
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 3 },
    ];
    assert.equal(judge({ x: 3, y: 4 }, body, [], "CAT", 0).kind, "self");
    assert.equal(judge({ x: 4, y: 3 }, body, [], "CAT", 0).kind, "none");
  });

  it("starts young players on short words and climbs", () => {
    assert.equal(wordFor("young", 0, () => 0).word.length, 3);
    assert.equal(wordFor("old", 0, () => 0).word.length, 4);
    assert.ok(wordFor("young", 9, () => 0).word.length >= 6);
  });
});
