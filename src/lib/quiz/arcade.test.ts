import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MEMORY_LEVELS, pairsForRound, secondsForRound } from "./arcade.ts";

describe("Memory Match levels", () => {
  it("adds cards every round up to the cap", () => {
    for (const level of Object.values(MEMORY_LEVELS)) {
      assert.equal(pairsForRound(level, 1), level.startPairs);
      assert.ok(pairsForRound(level, 2) > pairsForRound(level, 1));
      assert.equal(pairsForRound(level, 50), level.maxPairs);
    }
  });

  it("only times the harder levels, and the clock gets tighter", () => {
    assert.equal(secondsForRound(MEMORY_LEVELS.easy, 1, 4), 0);
    const hard = MEMORY_LEVELS.hard;
    assert.ok(secondsForRound(hard, 4, 10) / 10 < secondsForRound(hard, 1, 10) / 10);
    assert.ok(secondsForRound(hard, 50, 10) >= (10 * hard.secondsPerPair) / 2);
  });
});
