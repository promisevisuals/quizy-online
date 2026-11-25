/**
 * WHOT!: the Naija card game, rules only (no drawing), so it can be tested.
 *
 * Common Naija rules:
 *  - Play a card with the same shape or number as the top card. WHOT (20) can go on anything.
 *  - 1  Hold On: you play again.
 *  - 2  Pick Two: the next player picks 2 from market and loses their turn.
 *  - 5  Pick Three: the next player picks 3 and loses their turn.
 *  - 8  Suspension: the next player misses a turn.
 *  - 14 General Market: everyone else picks 1, and you play again.
 *  - 20 WHOT: you ask for a shape; the next player must play that shape (or another WHOT).
 *  - No card to play? Go to market (pick 1) and your turn ends.
 *  - First to finish their cards wins. If the market runs out, the lowest total in hand wins
 *    (star cards count double).
 *  - Optional "defend" rule: answer a Pick Two with a 2 (or Pick Three with a 5) to pass it on, bigger.
 */

export type Shape = "circle" | "triangle" | "cross" | "square" | "star" | "whot";
export const SHAPES: Exclude<Shape, "whot">[] = ["circle", "triangle", "cross", "square", "star"];
export type Card = { id: number; shape: Shape; n: number };

const NUMBERS: Record<Shape, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
  whot: [20, 20, 20, 20, 20],
};

export const SPECIAL: Record<number, string> = {
  1: "Hold On",
  2: "Pick Two",
  5: "Pick Three",
  8: "Suspension",
  14: "General Market",
  20: "WHOT",
};

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const shape of Object.keys(NUMBERS) as Shape[]) for (const n of NUMBERS[shape]) deck.push({ id: id++, shape, n });
  return deck;
}

export type Player = { name: string; cpu: boolean; hand: Card[] };
export type AiLevel = "easy" | "medium" | "hard" | "expert";

export type Whot = {
  players: Player[];
  pile: Card[];
  market: Card[];
  turn: number;
  /** Shape asked for after a WHOT, until someone follows it. */
  called: Exclude<Shape, "whot"> | null;
  /** Cards the current player must pick (Pick Two / Pick Three), if any. */
  pending: number;
  /** The card number that created the pending pick (2 or 5), for the defend rule. */
  pendingBy: number;
  defend: boolean;
  winner: number | null;
  /** Ended because the market ran out (lowest hand total wins). */
  countedOut: boolean;
  log: string[];
  rng: () => number;
};

function shuffle<T>(list: T[], rng: () => number) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function newWhot(names: string[], opts: { hand?: number; defend?: boolean; rng?: () => number } = {}): Whot {
  const rng = opts.rng ?? Math.random;
  const deck = shuffle(makeDeck(), rng);
  const hand = opts.hand ?? 5;
  const players = names.map((name, i) => ({ name, cpu: i > 0, hand: deck.splice(0, hand) }));
  // the first card on the table is an ordinary card
  let first = deck.findIndex((c) => !(c.n in SPECIAL));
  if (first < 0) first = 0;
  const [top] = deck.splice(first, 1);
  return {
    players,
    pile: [top!],
    market: deck,
    turn: 0,
    called: null,
    pending: 0,
    pendingBy: 0,
    defend: !!opts.defend,
    winner: null,
    countedOut: false,
    log: [`The game starts on ${cardName(top!)}.`],
    rng,
  };
}

export function top(g: Whot) {
  return g.pile[g.pile.length - 1]!;
}

export function cardName(c: Card) {
  if (c.shape === "whot") return "WHOT 20";
  return `${c.shape} ${c.n}`;
}

export function canPlay(g: Whot, c: Card) {
  if (g.winner !== null) return false;
  if (g.pending) return g.defend && c.n === g.pendingBy && c.shape !== "whot";
  if (c.shape === "whot") return true;
  if (g.called) return c.shape === g.called;
  const t = top(g);
  return c.shape === t.shape || c.n === t.n;
}

export function playable(g: Whot, who = g.turn) {
  return g.players[who]!.hand.filter((c) => canPlay(g, c));
}

function next(g: Whot, from = g.turn, steps = 1) {
  const n = g.players.length;
  return (from + steps) % n;
}

export function handValue(hand: Card[]) {
  return hand.reduce((sum, c) => sum + (c.shape === "star" ? c.n * 2 : c.n), 0);
}

/** Take cards from market. If it runs out, the game ends on points. */
function pick(g: Whot, who: number, count: number) {
  let got = 0;
  for (let i = 0; i < count; i++) {
    const c = g.market.pop();
    if (!c) break;
    g.players[who]!.hand.push(c);
    got++;
  }
  if (!g.market.length && g.winner === null) endOnPoints(g);
  return got;
}

function endOnPoints(g: Whot) {
  let best = 0;
  g.players.forEach((p, i) => {
    if (handValue(p.hand) < handValue(g.players[best]!.hand)) best = i;
  });
  g.winner = best;
  g.countedOut = true;
  g.log.push(`Market is finished! Counting cards… ${g.players[best]!.name} wins with the lowest total.`);
}

export type PlayResult = { ok: boolean; again: boolean; needsShape: boolean };

/**
 * Current player plays a card. For WHOT pass the shape they ask for
 * (if missing, `needsShape` comes back and nothing happens).
 */
export function play(g: Whot, cardId: number, ask?: Exclude<Shape, "whot">): PlayResult {
  const me = g.turn;
  const player = g.players[me]!;
  const card = player.hand.find((c) => c.id === cardId);
  if (!card || !canPlay(g, card)) return { ok: false, again: false, needsShape: false };
  if (card.shape === "whot" && !ask) return { ok: false, again: false, needsShape: true };
  player.hand = player.hand.filter((c) => c.id !== cardId);
  g.pile.push(card);
  g.called = card.shape === "whot" ? ask! : null;
  const who = player.name;
  g.log.push(card.shape === "whot" ? `${who} played WHOT and asks for ${ask}!` : `${who} played ${cardName(card)}${card.n in SPECIAL ? ` · ${SPECIAL[card.n]}!` : ""}`);

  if (!player.hand.length) {
    g.winner = me;
    g.log.push(`${who} has no cards left. ${who} wins! 🎉`);
    return { ok: true, again: false, needsShape: false };
  }
  if (player.hand.length === 1) g.log.push(`${who}: "Last card!"`);

  // defending a pick passes it on, bigger
  if (g.pending) {
    g.pending += card.n === 2 ? 2 : 3;
    g.turn = next(g);
    g.log.push(`${g.players[g.turn]!.name} must pick ${g.pending}!`);
    return { ok: true, again: false, needsShape: false };
  }

  switch (card.n) {
    case 1: // Hold On
      return { ok: true, again: true, needsShape: false };
    case 2:
    case 5: {
      g.pending = card.n === 2 ? 2 : 3;
      g.pendingBy = card.n;
      g.turn = next(g);
      if (!g.defend) {
        const victim = g.turn;
        const n = pick(g, victim, g.pending);
        g.log.push(`${g.players[victim]!.name} picks ${n} from market.`);
        g.pending = 0;
        g.pendingBy = 0;
        if (g.winner === null) g.turn = next(g, victim);
      } else {
        g.log.push(`${g.players[g.turn]!.name} must pick ${g.pending}!`);
      }
      return { ok: true, again: false, needsShape: false };
    }
    case 8: // Suspension
      g.log.push(`${g.players[next(g)]!.name} is suspended.`);
      g.turn = next(g, me, 2);
      return { ok: true, again: false, needsShape: false };
    case 14: // General Market
      for (let i = 1; i < g.players.length && g.winner === null; i++) pick(g, next(g, me, i), 1);
      g.log.push("General market! Everyone else picks one.");
      return { ok: true, again: g.winner === null, needsShape: false };
    default:
      g.turn = next(g);
      return { ok: true, again: false, needsShape: false };
  }
}

/** Current player goes to market: picks 1, or the pending Pick Two / Three. Turn passes on. */
export function goMarket(g: Whot) {
  if (g.winner !== null) return 0;
  const me = g.turn;
  const count = g.pending || 1;
  const got = pick(g, me, count);
  g.log.push(`${g.players[me]!.name} goes to market${count > 1 ? ` and picks ${got}` : ""}.`);
  g.pending = 0;
  g.pendingBy = 0;
  if (g.winner === null) g.turn = next(g, me);
  return got;
}

/* ───────── the computer players ───────── */

function favouriteShape(hand: Card[], rng: () => number): Exclude<Shape, "whot"> {
  const counts = new Map<Exclude<Shape, "whot">, number>();
  for (const c of hand) if (c.shape !== "whot") counts.set(c.shape, (counts.get(c.shape) ?? 0) + 1);
  let bestShape: Exclude<Shape, "whot"> | null = null;
  let bestN = -1;
  for (const [s, n] of counts) if (n > bestN) [bestShape, bestN] = [s, n];
  return bestShape ?? SHAPES[Math.floor(rng() * SHAPES.length)]!;
}

/** A shape the next player probably lacks: the one we've seen them fail on, or one we hold. */
function trickyShape(g: Whot, hand: Card[]): Exclude<Shape, "whot"> {
  return favouriteShape(hand, g.rng);
}

export type AiMove = { kind: "play"; cardId: number; ask?: Exclude<Shape, "whot"> } | { kind: "market" };

export function aiMove(g: Whot, level: AiLevel): AiMove {
  const me = g.turn;
  const hand = g.players[me]!.hand;
  const options = playable(g);
  if (!options.length) return { kind: "market" };
  if (level === "easy") {
    const c = options[Math.floor(g.rng() * options.length)]!;
    return { kind: "play", cardId: c.id, ask: c.shape === "whot" ? favouriteShape(hand.filter((h) => h.id !== c.id), g.rng) : undefined };
  }
  const nextPlayer = g.players[next(g)]!;
  const danger = nextPlayer.hand.length <= 2; // they are about to win
  const rest = (c: Card) => hand.filter((h) => h.id !== c.id);
  let best: Card = options[0]!;
  let bestScore = -Infinity;
  for (const c of options) {
    let s = 0;
    const after = rest(c);
    // keep WHOT for when nothing else fits (or to finish)
    if (c.shape === "whot") s -= after.length ? 30 : -100;
    // attack cards hurt more when the next player is close to winning
    if (c.n === 2) s += danger ? 40 : 12;
    if (c.n === 5) s += danger ? 45 : 14;
    if (c.n === 8) s += danger ? 35 : 8;
    if (c.n === 14) s += 10 + (level !== "medium" ? 6 : 0);
    // Hold On / General Market only help if I can follow up afterwards
    if (c.n === 1 || c.n === 14) {
      const follow = after.some((h) => h.shape === "whot" || h.shape === c.shape || h.n === c.n);
      s += follow ? 18 : -12;
    }
    // stay flexible: lead into the shape I hold most
    s += after.filter((h) => h.shape === c.shape).length * (level === "medium" ? 2 : 4);
    // get rid of big cards first (fewer points if the market finishes)
    s += c.n * (level === "expert" ? 0.8 : 0.4);
    // finishing move
    if (!after.length) s += 1000;
    if (level === "medium") s += g.rng() * 8;
    if (s > bestScore) [best, bestScore] = [c, s];
  }
  return {
    kind: "play",
    cardId: best.id,
    ask: best.shape === "whot" ? (level === "medium" ? favouriteShape(rest(best), g.rng) : trickyShape(g, rest(best))) : undefined,
  };
}

/** Seeded random numbers for repeatable games and tests. */
export function seededRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}
