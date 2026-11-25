import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAND_TOPICS, matchesPick, pickTitle } from "./topics.ts";

const bank = JSON.parse(readFileSync(new URL("../../data/bank.json", import.meta.url), "utf8"));
const sports = bank.lands.find((l: { id: string }) => l.id === "sports").questions as { q: string; topic?: string; also?: string[]; tags?: string[]; opts: string[]; a: number }[];
const unique = (list: typeof sports) => [...new Map(list.map((q) => [q.q, q])).values()];

describe("Sports Arena topics", () => {
  it("every sports question has a topic from the menu", () => {
    const ids = new Set(LAND_TOPICS.sports!.map((t) => t.id));
    for (const q of sports) assert.ok(q.topic && ids.has(q.topic), q.q);
  });

  it("every sport, football period and team has at least 5 different questions", () => {
    for (const topic of LAND_TOPICS.sports!) {
      const n = unique(sports.filter((q) => matchesPick(q, { topic: topic.id, choices: {} }))).length;
      assert.ok(n >= 5, `${topic.id}: ${n}`);
      for (const filter of topic.filters ?? []) {
        for (const option of filter.options) {
          const m = unique(sports.filter((q) => matchesPick(q, { topic: topic.id, choices: { [filter.key]: option.id } }))).length;
          assert.ok(m >= 5, `${topic.id} ${filter.key}=${option.id}: ${m}`);
        }
      }
    }
  });

  it("filters really narrow: Chelsea questions are about Chelsea, 2010s questions are from the 2010s", () => {
    const chelsea = sports.filter((q) => matchesPick(q, { topic: "football", choices: { team: "chelsea" } }));
    assert.ok(chelsea.every((q) => q.tags?.includes("team:chelsea")));
    const tennisInFootball = sports.filter((q) => matchesPick(q, { topic: "football", choices: {} })).some((q) => q.topic === "tennis");
    assert.equal(tennisInFootball, false);
    assert.ok(matchesPick({ topic: "athletics", also: ["olympics"] }, { topic: "olympics", choices: {} }));
  });

  it("answers are always among the options and options are unique", () => {
    for (const q of sports) {
      assert.ok(q.opts[q.a], q.q);
      assert.equal(new Set(q.opts).size, q.opts.length, q.q);
    }
  });

  it("round titles read naturally", () => {
    assert.equal(pickTitle("sports", { topic: "football", choices: { era: "2010s", team: "chelsea" } }), "Football · 2010s · Chelsea");
    assert.equal(pickTitle("sports", null), "");
  });
});
