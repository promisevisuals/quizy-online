import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bank = JSON.parse(readFileSync(new URL("../src/data/bible.json", import.meta.url), "utf8"));
const blurbs = JSON.parse(readFileSync(new URL("../src/data/bible-blurbs.json", import.meta.url), "utf8"));

test("King's Bible Quest bank has the same shape as the Quizy bank", () => {
  assert.ok(Array.isArray(bank.lands) && Array.isArray(bank.breaks) && Array.isArray(bank.academy));
  assert.equal(bank.lands.length, 16);
});

test("every section has a full round for kids and for grown-ups", () => {
  for (const land of bank.lands) {
    const kids = land.questions.filter((q) => !q.age8 && !q.replace);
    const adults = land.questions.filter((q) => q.age8);
    assert.ok(kids.length >= land.count, `${land.id} kids ${kids.length}`);
    assert.ok(adults.length >= land.count, `${land.id} grown-ups ${adults.length}`);
    assert.ok(blurbs[land.id], `${land.id} has a blurb`);
  }
});

test("questions are well formed, unique, and cite a verse or fact", () => {
  const ids = new Set();
  const texts = new Set();
  for (const land of bank.lands) {
    for (const q of land.questions) {
      assert.equal(q.kind, "choice");
      assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
      ids.add(q.id);
      assert.ok(!texts.has(q.q), `duplicate question ${q.q}`);
      texts.add(q.q);
      assert.equal(q.opts.length, 4);
      assert.equal(new Set(q.opts).size, 4, q.q);
      assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, q.q);
      assert.ok(["easy", "medium", "difficult", "advanced"].includes(q.difficulty), q.q);
      assert.ok(q.exp.length > 10, q.q);
    }
  }
});

test("answers are spread across positions", () => {
  const counts = [0, 0, 0, 0];
  for (const land of bank.lands) for (const q of land.questions) counts[q.a] += 1;
  const total = counts.reduce((a, b) => a + b, 0);
  for (const c of counts) assert.ok(c > total * 0.15, `answer spread ${counts}`);
});

test("break cards have text and an answer", () => {
  assert.ok(bank.breaks.length >= 10);
  for (const card of bank.breaks) {
    assert.ok(["know", "riddle"].includes(card.type));
    assert.ok(card.text && card.answer);
  }
});
