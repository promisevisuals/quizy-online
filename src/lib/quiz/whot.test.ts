import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aiMove, canPlay, goMarket, makeDeck, newWhot, play, seededRng, top, type AiLevel, type Card, type Whot } from "./whot.ts";

function game(players = 2, defend = false): Whot {
  return newWhot(Array.from({ length: players }, (_, i) => (i ? `CPU ${i}` : "You")), { rng: seededRng(11), defend });
}
function give(g: Whot, who: number, cards: Omit<Card, "id">[]) {
  g.players[who]!.hand = cards.map((c, i) => ({ ...c, id: 1000 + who * 100 + i }));
}
function setTop(g: Whot, c: Omit<Card, "id">) {
  g.pile.push({ ...c, id: 999 });
}

describe("WHOT", () => {
  it("has the 54-card Naija deck", () => {
    const deck = makeDeck();
    assert.equal(deck.length, 54);
    assert.equal(deck.filter((c) => c.shape === "whot").length, 5);
    assert.equal(deck.filter((c) => c.shape === "star").length, 7);
  });

  it("deals 5 each and starts on an ordinary card", () => {
    const g = game(4);
    assert.ok(g.players.every((p) => p.hand.length === 5));
    assert.ok(![1, 2, 5, 8, 14, 20].includes(top(g).n));
    assert.equal(g.market.length + g.players.length * 5 + 1, 54);
  });

  it("follows shape or number, and WHOT goes on anything", () => {
    const g = game();
    setTop(g, { shape: "circle", n: 7 });
    assert.ok(canPlay(g, { id: 1, shape: "circle", n: 3 }));
    assert.ok(canPlay(g, { id: 2, shape: "square", n: 7 }));
    assert.ok(!canPlay(g, { id: 3, shape: "square", n: 3 }));
    assert.ok(canPlay(g, { id: 4, shape: "whot", n: 20 }));
  });

  it("Hold On lets you play again", () => {
    const g = game();
    setTop(g, { shape: "circle", n: 7 });
    give(g, 0, [{ shape: "circle", n: 1 }, { shape: "circle", n: 3 }]);
    const r = play(g, 1000);
    assert.ok(r.again);
    assert.equal(g.turn, 0);
  });

  it("Pick Two makes the next player pick two and skip", () => {
    const g = game(3);
    setTop(g, { shape: "star", n: 7 });
    give(g, 0, [{ shape: "star", n: 2 }, { shape: "circle", n: 3 }]);
    const before = g.players[1]!.hand.length;
    play(g, 1000);
    assert.equal(g.players[1]!.hand.length, before + 2);
    assert.equal(g.turn, 2);
  });

  it("Pick Three gives three cards", () => {
    const g = game(2);
    setTop(g, { shape: "triangle", n: 4 });
    give(g, 0, [{ shape: "triangle", n: 5 }, { shape: "circle", n: 3 }]);
    const before = g.players[1]!.hand.length;
    play(g, 1000);
    assert.equal(g.players[1]!.hand.length, before + 3);
    assert.equal(g.turn, 0, "with two players the turn comes straight back");
  });

  it("Suspension skips the next player", () => {
    const g = game(3);
    setTop(g, { shape: "cross", n: 7 });
    give(g, 0, [{ shape: "circle", n: 8 }, { shape: "triangle", n: 8 }]);
    setTop(g, { shape: "circle", n: 7 });
    play(g, 1000);
    assert.equal(g.turn, 2);
  });

  it("General Market gives everyone else a card and you go again", () => {
    const g = game(4);
    setTop(g, { shape: "square", n: 14 });
    give(g, 0, [{ shape: "circle", n: 14 }, { shape: "circle", n: 3 }]);
    const sizes = g.players.map((p) => p.hand.length);
    const r = play(g, 1000);
    assert.ok(r.again);
    for (let i = 1; i < 4; i++) assert.equal(g.players[i]!.hand.length, sizes[i]! + 1);
  });

  it("WHOT asks for a shape that the next player must follow", () => {
    const g = game();
    setTop(g, { shape: "circle", n: 7 });
    give(g, 0, [{ shape: "whot", n: 20 }, { shape: "circle", n: 3 }]);
    assert.ok(play(g, 1000).needsShape);
    play(g, 1000, "star");
    assert.equal(g.called, "star");
    assert.ok(canPlay(g, { id: 5, shape: "star", n: 3 }));
    assert.ok(!canPlay(g, { id: 6, shape: "circle", n: 20 - 13 }));
  });

  it("going to market takes one card and ends your turn", () => {
    const g = game();
    const before = g.players[0]!.hand.length;
    goMarket(g);
    assert.equal(g.players[0]!.hand.length, before + 1);
    assert.equal(g.turn, 1);
  });

  it("defend rule: answer a Pick Two with a Two and it grows", () => {
    const g = game(3, true);
    setTop(g, { shape: "star", n: 7 });
    give(g, 0, [{ shape: "star", n: 2 }, { shape: "circle", n: 3 }]);
    give(g, 1, [{ shape: "circle", n: 2 }, { shape: "circle", n: 9 }]);
    play(g, 1000);
    assert.equal(g.pending, 2);
    assert.equal(g.turn, 1);
    play(g, 1100);
    assert.equal(g.pending, 4);
    const before = g.players[2]!.hand.length;
    goMarket(g);
    assert.equal(g.players[2]!.hand.length, before + 4);
  });

  it("playing your last card wins", () => {
    const g = game();
    setTop(g, { shape: "circle", n: 7 });
    give(g, 0, [{ shape: "circle", n: 3 }]);
    play(g, 1000);
    assert.equal(g.winner, 0);
  });

  it("computer players finish whole games at every level", () => {
    for (const level of ["easy", "medium", "hard", "expert"] as AiLevel[]) {
      for (let seed = 1; seed <= 20; seed++) {
        const g = newWhot(["A", "B", "C", "D"], { rng: seededRng(seed), defend: seed % 2 === 0 });
        let steps = 0;
        while (g.winner === null && steps < 2000) {
          const m = aiMove(g, level);
          if (m.kind === "market") goMarket(g);
          else {
            const r = play(g, m.cardId, m.ask);
            assert.ok(r.ok, `${level} seed ${seed}: illegal move`);
          }
          steps++;
        }
        assert.notEqual(g.winner, null, `${level} seed ${seed} never finished`);
      }
    }
  });
});
