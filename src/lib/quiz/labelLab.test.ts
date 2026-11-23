import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LABEL_LEVELS, labelSeconds, labelsForRound } from "./arcade.ts";
import { LABEL_DIAGRAMS } from "./labelDiagrams.ts";
import { buildRound, nextDiagram } from "./labelLab.ts";

const rnd = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
})();

describe("Label Lab", () => {
  it("every diagram has unique words and slots inside the picture", () => {
    for (const d of LABEL_DIAGRAMS) {
      const words = d.parts.map((p) => p.word);
      assert.equal(new Set(words).size, words.length, d.id);
      for (const p of d.parts) {
        for (const [x, y] of [p.at, p.slot]) assert.ok(x >= 0 && x <= 480 && y >= 0 && y <= 400, `${d.id} ${p.word}`);
      }
    }
  });

  it("builds rounds with the right words plus trick words", () => {
    for (const level of Object.values(LABEL_LEVELS)) {
      for (const d of LABEL_DIAGRAMS) {
        const r = buildRound(d, level, labelsForRound(level, 3), rnd);
        assert.ok(r.targets.length >= 1 && r.targets.length <= d.parts.length);
        assert.equal(r.bank.length, r.targets.length + Math.min(level.decoys, r.bank.length - r.targets.length));
        for (const t of r.targets) assert.ok(r.bank.includes(t.word));
        assert.equal(new Set(r.bank).size, r.bank.length, "no duplicate chips");
      }
    }
  });

  it("easy rounds use everyday words when the picture has them", () => {
    const r = buildRound(LABEL_DIAGRAMS[0]!, LABEL_LEVELS.easy, 3, rnd);
    assert.ok(r.targets.every((t) => t.part.tier === 1));
    assert.ok(r.targets.every((t) => !["Abdomen", "Femur"].includes(t.word)));
  });

  it("hard levels use the science names", () => {
    const skeleton = LABEL_DIAGRAMS.find((d) => d.id === "skeleton")!;
    const r = buildRound(skeleton, LABEL_LEVELS.expert, 9, rnd);
    assert.ok(r.bank.includes("Femur") && !r.bank.includes("Thigh bone"));
  });

  it("adds labels and squeezes the clock as rounds go on", () => {
    for (const level of Object.values(LABEL_LEVELS)) {
      assert.ok(labelsForRound(level, 4) > labelsForRound(level, 1));
      assert.ok(labelSeconds(level, 6, 5) < labelSeconds(level, 1, 5));
      assert.ok(labelSeconds(level, 99, 5) >= Math.round(5 * level.minSecondsPerLabel));
    }
  });

  it("mixed runs don't repeat the same picture twice in a row", () => {
    let last = "";
    for (let i = 0; i < 30; i++) {
      const d = nextDiagram(LABEL_LEVELS.medium, 5, "mixed", last, rnd);
      assert.notEqual(d.id, last);
      last = d.id;
    }
  });
});
