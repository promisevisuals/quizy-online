import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LABEL_LEVELS, labelSeconds } from "./arcade.ts";
import { LABEL_TOPICS } from "./labelDiagrams.ts";
import { BOX, buildRound, clashes, decoysFor, labelsFor, layoutSlots, nextPlan, slotSize } from "./labelLab.ts";

const seeded = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;

describe("Label Lab content", () => {
  it("every stage teaches new words: no word repeats inside a topic's stages, except a few on new drawings", () => {
    for (const topic of LABEL_TOPICS) {
      assert.ok(topic.stages.length >= 3, `${topic.id} has a ladder of stages`);
      topic.stages.forEach((stage, i) => {
        const words = stage.parts.map((p) => p.word);
        assert.equal(new Set(words).size, words.length, `${topic.id} stage ${i + 1} has no duplicates`);
        if (i > 0) {
          const before = topic.stages.slice(0, i).filter((s) => s.art === stage.art).flatMap((s) => s.parts.map((p) => p.word));
          for (const w of words) assert.ok(!before.includes(w), `${topic.id} stage ${i + 1} repeats ${w} on the same drawing`);
        }
        assert.ok(stage.fact.length > 20, `${topic.id} stage ${i + 1} has a fact`);
      });
    }
  });

  it("stages grow: stage 1 has 5-6 easy parts and later stages are at least as big", () => {
    for (const topic of LABEL_TOPICS) {
      const first = topic.stages[0]!.parts.length;
      assert.ok(first >= 5 && first <= 6, `${topic.id} starts with ${first}`);
      const last = topic.stages[topic.stages.length - 1]!.parts.length;
      assert.ok(last >= first, `${topic.id} ends bigger`);
    }
  });

  it("all points are on the drawing and no two blanks overlap, even with every part showing", () => {
    for (const topic of LABEL_TOPICS) {
      topic.stages.forEach((stage, i) => {
        const slots = layoutSlots(stage.parts);
        stage.parts.forEach((p, k) => {
          const [x, y] = p.at;
          assert.ok(x >= 0 && x <= BOX && y >= 0 && y <= BOX, `${topic.id}/${i + 1} ${p.word} point`);
          const s = slots[k]!;
          assert.ok(s.x - s.w / 2 >= 0 && s.x + s.w / 2 <= BOX && s.y - s.h / 2 >= 0 && s.y + s.h / 2 <= BOX, `${topic.id}/${i + 1} ${p.word} blank inside`);
        });
        for (let a = 0; a < slots.length; a++)
          for (let b = a + 1; b < slots.length; b++)
            assert.ok(!overlap(slots[a]!, slots[b]!), `${topic.id}/${i + 1}: ${stage.parts[a]!.word} overlaps ${stage.parts[b]!.word}`);
      });
    }
  });

  it("long names shrink their font so they fit beside the drawing", () => {
    assert.ok(slotSize("Pulmonary artery").w <= 150);
    assert.ok(slotSize("Eye").w < slotSize("Eyebrow").w);
  });
});

describe("Label Lab rounds", () => {
  it("rounds use the stage's own parts, with the bank holding every answer once", () => {
    const rnd = seeded(7);
    for (const level of Object.values(LABEL_LEVELS)) {
      for (const topic of LABEL_TOPICS) {
        topic.stages.forEach((stage, i) => {
          const r = buildRound(topic, i + 1, level, rnd);
          assert.equal(r.targets.length, labelsFor(level, i + 1, stage.parts.length));
          for (const t of r.targets) assert.ok(stage.parts.includes(t.part) && r.bank.includes(t.word));
          assert.equal(new Set(r.bank).size, r.bank.length, "no duplicate chips");
          assert.equal(r.bank.length, r.targets.length + level.decoys);
        });
      }
    }
  });

  it("young players see fewer labels than experts, and both get more as stages go on", () => {
    assert.ok(labelsFor(LABEL_LEVELS.easy, 1, 6) < labelsFor(LABEL_LEVELS.expert, 1, 6));
    for (const level of Object.values(LABEL_LEVELS)) {
      assert.ok(labelsFor(level, 4, 12) > labelsFor(level, 1, 12));
      assert.ok(labelSeconds(level, 5, 5) < labelSeconds(level, 1, 5));
      assert.ok(labelSeconds(level, 99, 5) >= Math.round(5 * level.minSecondsPerLabel));
    }
  });

  it("trick words never name a real part of the picture (or a synonym of one)", () => {
    const rnd = seeded(3);
    for (const topic of LABEL_TOPICS) {
      const own = LABEL_TOPICS.filter((t) => t.group === topic.group).flatMap((t) => t.stages.flatMap((s) => s.parts.map((p) => p.word)));
      for (let stage = 1; stage <= topic.stages.length; stage++) {
        const tricks = decoysFor(topic, stage, 3, rnd);
        assert.equal(tricks.length, 3);
        for (const w of tricks) assert.ok(!own.some((o) => clashes(o, w)), `${topic.id}: ${w}`);
      }
    }
    assert.ok(clashes("Eye", "Compound eye"));
    assert.ok(clashes("Thigh bone", "Femur"));
    assert.ok(clashes("Kidneys", "Kidney"));
    assert.ok(!clashes("Petal", "Crater"));
  });

  it("one topic climbs its stages then finishes; a mix moves up a stage each round and never repeats a topic back to back", () => {
    const body = LABEL_TOPICS.find((t) => t.id === "body")!;
    assert.equal(nextPlan("body", 2, "body")?.stageNo, 2);
    assert.equal(nextPlan("body", body.stages.length + 1, "body"), null);
    const rnd = seeded(11);
    let last = "";
    for (let stage = 1; stage <= 3; stage++) {
      const plan = nextPlan("mixed", stage, last, rnd)!;
      assert.notEqual(plan.topic.id, last);
      assert.ok(plan.topic.stages.length >= stage);
      last = plan.topic.id;
    }
    const longest = Math.max(...LABEL_TOPICS.map((t) => t.stages.length));
    assert.equal(nextPlan("mixed", longest + 1, ""), null);
  });
});
