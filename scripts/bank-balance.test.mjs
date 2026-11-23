// Guards against the "longest answer is the right one" giveaway in the
// built-in question bank. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bank = JSON.parse(readFileSync(new URL("../src/data/bank.json", import.meta.url), "utf8"));

const choiceQuestions = [
  ...bank.lands.flatMap((land) =>
    land.questions.filter((q) => q.kind === "choice").map((q) => ({ ...q, land: land.id })),
  ),
  ...bank.academy.map((q) => ({ ...q, land: "academy" })),
];

function stats(q) {
  const lens = q.opts.map((o) => o.length);
  const correct = lens[q.a];
  const wrong = lens.filter((_, i) => i !== q.a);
  const mean = wrong.reduce((s, n) => s + n, 0) / wrong.length;
  return { correct, maxWrong: Math.max(...wrong), mean };
}

test("every choice question has a valid answer index and unique options", () => {
  for (const q of choiceQuestions) {
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.opts.length, `bad answer index: ${q.q}`);
    assert.equal(new Set(q.opts).size, q.opts.length, `duplicate options: ${q.q}`);
  }
});

test("the correct answer is not usually the longest option", () => {
  const longest = choiceQuestions.filter((q) => {
    const s = stats(q);
    return s.correct > s.maxWrong;
  }).length;
  const share = longest / choiceQuestions.length;
  assert.ok(share < 0.35, `correct answer is the longest option in ${(share * 100).toFixed(0)}% of questions`);
});

test("no question gives its answer away by length", () => {
  const giveaways = choiceQuestions.filter((q) => {
    const s = stats(q);
    return s.correct > s.maxWrong && s.correct / s.mean >= 1.5 && s.correct - s.mean >= 10;
  });
  assert.deepEqual(
    giveaways.map((q) => `${q.land}: ${q.q}`),
    [],
    "rewrite these so the wrong options are as long and specific as the right one",
  );
});
