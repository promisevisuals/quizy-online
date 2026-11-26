import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SIZE, cheer, collapse, ensureMove, finaleStep, findMove, findRuns, goalDone, levelFor, matchStep, newMatch, seededRng, shuffleNow, smash, trySwap, type Grid, type Match, type Piece } from "./match3.ts";

let id = 5000;
function grid(rows: string[]): Grid {
  // letters a-f = colours 0-5, # = crate, R/C/B = striped row / col / bomb of colour 0, * = rainbow
  return rows.map((row) =>
    row.split("").map((ch): Piece | null => {
      if (ch === ".") return null;
      if (ch === "#") return { id: id++, color: -1, special: null, hits: 1 };
      if (ch === "*") return { id: id++, color: -2, special: "rainbow" };
      if (ch === "R") return { id: id++, color: 0, special: "row" };
      if (ch === "C") return { id: id++, color: 0, special: "col" };
      if (ch === "B") return { id: id++, color: 0, special: "bomb" };
      return { id: id++, color: ch.charCodeAt(0) - 97, special: null };
    }),
  );
}
// a busy background with no matches
const BG = ["bcdebcde", "debcdebc", "cdebcdeb", "ebcdebcd", "bcdebcde", "debcdebc", "cdebcdeb", "ebcdebcd"];
function match(rows: string[]): Match {
  const m = newMatch(levelFor(1), seededRng(3));
  m.grid = grid(rows);
  return m;
}
function withRow(y: number, row: string, base = BG) {
  return base.map((r, i) => (i === y ? row : r));
}

describe("Sweet Swap", () => {
  it("starts with no matches and at least one move", () => {
    for (let s = 1; s <= 30; s++) {
      const m = newMatch(levelFor(s), seededRng(s));
      assert.equal(findRuns(m.grid).length, 0);
      assert.ok(findMove(m.grid));
      assert.equal(m.grid.flat().filter((p) => p?.color === -1).length, m.level.crates);
    }
  });

  it("a swap that makes no line goes back and costs nothing", () => {
    const m = match(BG);
    const moves = m.movesLeft;
    assert.equal(trySwap(m, [0, 0], [1, 0]), null);
    assert.equal(m.movesLeft, moves);
  });

  it("three in a row pops and scores", () => {
    const m = match(withRow(0, "aabcdebc").map((r, i) => (i === 1 ? "deacdebc" : r)));
    const step = trySwap(m, [2, 0], [2, 1]);
    assert.ok(step);
    assert.equal(step!.cleared.length, 3);
    assert.ok(m.score > 0);
  });

  it("four in a line makes a striped sweet", () => {
    const m = match(withRow(0, "aabaedbc").map((r, i) => (i === 1 ? "deacdebc" : r)));
    const step = trySwap(m, [2, 0], [2, 1]);
    assert.equal(step!.made.length, 1);
    assert.equal(m.grid[0]![2]!.special, "row");
  });

  it("an L shape makes a bomb", () => {
    const m = match(["aaaebcde", "aebcdebc", "adebcdeb", ...BG.slice(3)]);
    const step = matchStep(m);
    assert.equal(step!.made.length, 1);
    assert.equal(m.grid.flat().filter((p) => p?.special === "bomb").length, 1);
  });

  it("five in a line makes a rainbow ball", () => {
    const m = match(withRow(0, "aabaaebc").map((r, i) => (i === 1 ? "deacdebc" : r)));
    const step = trySwap(m, [2, 0], [2, 1]);
    assert.ok(step);
    assert.equal(m.grid[0]![2]!.special, "rainbow");
  });

  it("a striped sweet clears its whole row when it pops", () => {
    const m = match(withRow(3, "Raacdebc"));
    m.grid[3]![1] = { id: id++, color: 0, special: null };
    m.grid[3]![2] = { id: id++, color: 0, special: null };
    const step = matchStep(m);
    assert.ok(step!.cleared.length >= SIZE);
    assert.ok(m.grid[3]!.every((p) => p === null));
  });

  it("a rainbow ball swapped with a sweet clears every sweet of that colour", () => {
    const m = match(BG);
    m.grid[0]![0] = { id: id++, color: -2, special: "rainbow" };
    const color = m.grid[0]![1]!.color;
    const count = m.grid.flat().filter((p) => p?.color === color).length;
    const step = trySwap(m, [0, 0], [1, 0]);
    assert.equal(step!.cleared.length, count + 1);
    assert.equal(m.grid.flat().filter((p) => p?.color === color).length, 0);
  });

  it("a match next to a crate breaks it", () => {
    const m = newMatch({ ...levelFor(3), crates: 0 }, seededRng(1));
    m.grid = grid(withRow(1, "aaacdebc").map((r, i) => (i === 2 ? "#ebcdebc" : r)));
    m.cratesLeft = 1;
    matchStep(m);
    assert.equal(m.cratesLeft, 0);
    assert.ok(goalDone({ ...m, level: { ...m.level, goal: { kind: "crates", count: 1 } } }));
  });

  it("after popping, everything falls and the board refills", () => {
    const m = match(withRow(7, "aaacdebc"));
    matchStep(m);
    collapse(m);
    assert.ok(m.grid.every((row) => row.every((p) => p !== null)));
  });

  it("whole levels can be played by always taking a move, without errors", () => {
    for (let n = 1; n <= 12; n++) {
      const m = newMatch(levelFor(n), seededRng(n * 7));
      while (m.movesLeft > 0 && !goalDone(m)) {
        const mv = findMove(m.grid);
        assert.ok(mv, "there is always a move");
        let step = trySwap(m, mv![0], mv![1]);
        assert.ok(step);
        let guard = 0;
        while (step && guard++ < 100) {
          collapse(m);
          step = matchStep(m);
        }
        ensureMove(m);
        assert.ok(m.grid.every((row) => row.every((p) => p !== null)));
      }
    }
  });

  it("jelly levels: popping a sweet on jelly clears it", () => {
    const lv = levelFor(4);
    assert.equal(lv.goal.kind, "jelly");
    const m = newMatch(lv, seededRng(2));
    assert.equal(m.jelly.flat().filter(Boolean).length, lv.jelly);
    const before = m.jellyLeft;
    const pos = (() => { for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (m.jelly[y]![x]) return [x, y] as [number, number]; return [0, 0] as [number, number]; })();
    smash(m, pos);
    assert.equal(m.jellyLeft, before - 1);
  });

  it("the hammer smashes one sweet, and a striped one clears its row", () => {
    const m = match(BG);
    const step = smash(m, [3, 3]);
    assert.equal(step!.cleared.length, 1);
    m.grid = grid(BG);
    m.grid[2]![4]!.special = "row";
    const s2 = smash(m, [4, 2]);
    assert.equal(s2!.cleared.length, SIZE);
  });

  it("the finale turns every move left into a blast", () => {
    const m = newMatch(levelFor(2), seededRng(4));
    m.movesLeft = 3;
    const score = m.score;
    let steps = 0;
    while (finaleStep(m) && steps < 50) {
      collapse(m);
      while (matchStep(m)) collapse(m);
      steps++;
    }
    assert.equal(m.movesLeft, 0);
    assert.ok(m.score > score + 3 * 100);
  });

  it("shuffle keeps every sweet and leaves a move", () => {
    const m = newMatch(levelFor(5), seededRng(8));
    const count = m.grid.flat().filter((p) => p && p.color >= 0).length;
    shuffleNow(m);
    assert.equal(m.grid.flat().filter((p) => p && p.color >= 0).length, count);
    assert.ok(findMove(m.grid));
  });

  it("cheers get bigger with bigger combos", () => {
    assert.equal(cheer(1, 0), "");
    assert.equal(cheer(3, 0), "Sweet!");
    assert.equal(cheer(4, 0), "Tasty!");
    assert.equal(cheer(5, 0), "Delicious!");
    assert.equal(cheer(2, 3), "Divine!");
  });
});
