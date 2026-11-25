import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  COLS,
  HIDDEN,
  KINDS,
  TOTAL_ROWS,
  cellsOf,
  collides,
  emptyBoard,
  gravityMs,
  hardDrop,
  hold,
  move,
  newGame,
  rotate,
  seeded,
  tick,
  type Game,
  type Kind,
} from "./bricks.ts";

function withPiece(kind: Kind): Game {
  const g = newGame(1, seeded(7));
  g.piece = { kind, rot: 0, x: kind === "O" ? 4 : 3, y: HIDDEN - 1 };
  return g;
}

describe("Brick Drop", () => {
  it("every shape has four cells in every turn, and four turns bring it back", () => {
    for (const kind of KINDS) {
      const g = withPiece(kind);
      const start = JSON.stringify(cellsOf(g.piece!).sort());
      for (let i = 0; i < 4; i++) {
        assert.equal(cellsOf(g.piece!).length, 4);
        rotate(g, 1);
      }
      assert.equal(JSON.stringify(cellsOf(g.piece!).sort()), start, kind);
    }
  });

  it("deals every shape once in each bag of seven", () => {
    const g = newGame(1, seeded(42));
    const seen: Kind[] = [g.piece!.kind];
    while (seen.length < 14) {
      hardDrop(g);
      g.board = emptyBoard();
      seen.push(g.piece!.kind);
    }
    assert.equal(new Set(seen.slice(0, 7)).size, 7);
    assert.equal(new Set(seen.slice(7, 14)).size, 7);
  });

  it("walls stop sideways moves", () => {
    const g = withPiece("O");
    for (let i = 0; i < 20; i++) move(g, -1);
    assert.equal(Math.min(...cellsOf(g.piece!).map(([x]) => x)), 0);
    for (let i = 0; i < 20; i++) move(g, 1);
    assert.equal(Math.max(...cellsOf(g.piece!).map(([x]) => x)), COLS - 1);
  });

  it("turns next to a wall by kicking away from it", () => {
    const g = withPiece("I");
    rotate(g, 1); // standing up
    for (let i = 0; i < 10; i++) move(g, -1);
    assert.ok(rotate(g, 1), "the I brick should kick off the left wall");
    assert.ok(!collides(g.board, g.piece!));
  });

  it("clears a full row and scores it", () => {
    const g = withPiece("I");
    const bottom = TOTAL_ROWS - 1;
    for (let x = 0; x < COLS; x++) g.board[bottom]![x] = x < 4 ? null : "T";
    for (let i = 0; i < 5; i++) move(g, -1);
    const cleared = hardDrop(g);
    assert.deepEqual(cleared, [bottom]);
    assert.equal(g.lines, 1);
    assert.ok(g.board[bottom]!.every((c) => c === null));
    assert.ok(g.score >= 100);
  });

  it("four rows at once scores 800 times the level", () => {
    const g = withPiece("I");
    rotate(g, 1);
    const col = cellsOf(g.piece!)[0]![0];
    for (let y = TOTAL_ROWS - 4; y < TOTAL_ROWS; y++) for (let x = 0; x < COLS; x++) g.board[y]![x] = x === col ? null : "S";
    const before = g.score;
    hardDrop(g);
    assert.equal(g.lines, 4);
    assert.ok(g.score - before >= 800);
  });

  it("levels up every ten lines and falls faster", () => {
    const g = newGame(1, seeded(1));
    g.lines = 9;
    g.piece = { kind: "I", rot: 0, x: 0, y: HIDDEN - 1 };
    for (let x = 4; x < COLS; x++) g.board[TOTAL_ROWS - 1]![x] = "Z";
    hardDrop(g);
    assert.equal(g.level, 2);
    assert.ok(gravityMs(2) < gravityMs(1));
  });

  it("locks a resting piece after the lock delay", () => {
    const g = newGame(1, seeded(3));
    const first = g.piece!.kind;
    for (let i = 0; i < 200 && g.piece?.kind === first && !g.lastClear.length; i++) {
      if (tick(g, 100) === "lock") break;
    }
    assert.ok(g.board.some((row) => row.some((c) => c !== null)));
  });

  it("hold swaps once per piece", () => {
    const g = newGame(1, seeded(9));
    const first = g.piece!.kind;
    assert.ok(hold(g));
    assert.equal(g.hold, first);
    assert.equal(hold(g), false);
    hardDrop(g);
    assert.ok(hold(g));
    assert.equal(g.piece!.kind, first);
  });

  it("ends the game when the stack reaches the top", () => {
    const g = newGame(1, seeded(5));
    for (let i = 0; i < 200 && !g.over; i++) hardDrop(g);
    assert.ok(g.over);
    assert.equal(emptyBoard().length, TOTAL_ROWS);
  });
});
