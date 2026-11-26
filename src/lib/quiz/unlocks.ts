/**
 * The fun games (Brick Drop, WHOT, Sweet Swap, Bouncy Ball) are earned with learning.
 *
 * 1. Unlocking: each game opens once the explorer has PASSED enough different lands.
 *    A land counts as passed when its best score is at least PASS_SHARE of its questions (7 of 10).
 * 2. Tickets: every land round finished with a pass mark pays TICKETS_PER_PASS game tickets.
 *    One ticket = one game (one WHOT match, one Brick Drop game, one Sweet Swap run, one Bouncy Ball run).
 *
 * Owners (the Command Center role) can always play, so they can test the games.
 */

export const PASS_SHARE = 0.7;
export const TICKETS_PER_PASS = 3;
/** A perfect round pays one extra ticket. */
export const PERFECT_BONUS = 1;

export type FunGameId = "bricks" | "whot" | "match" | "bounce";

export type FunGame = {
  id: FunGameId;
  name: string;
  art: string;
  note: string;
  /** Different lands passed before this game opens. */
  needLands: number;
};

export const FUN_GAMES: FunGame[] = [
  {
    id: "bricks",
    name: "Brick Drop",
    art: "/art/games/bricks.svg",
    note: "Turn and drop the falling bricks. Fill a whole row to clear it. How long can you last?",
    needLands: 1,
  },
  {
    id: "whot",
    name: "WHOT!",
    art: "/art/games/whot.svg",
    note: "The Naija card game against the computer: Pick Two, Hold On, Suspension, General Market and WHOT 20.",
    needLands: 2,
  },
  {
    id: "match",
    name: "Sweet Swap",
    art: "/art/games/match.svg",
    note: "Swap sweets to line up three or more. Striped sweets, bombs, rainbow balls, jelly, boosters and a sweet finale.",
    needLands: 3,
  },
  {
    id: "bounce",
    name: "Bouncy Ball",
    art: "/art/games/bounce.svg",
    note: "20 levels in 3 worlds, each with a boss. Squash bugs, grab shields, fire and wings, and collect every ring.",
    needLands: 4,
  },
];

export function passMark(count: number) {
  return Math.ceil(count * PASS_SHARE);
}

/** How many different lands have a best score at or above the pass mark. */
export function passedLands(landCorrect: Record<string, number>, lands: { id: string; count: number }[]) {
  return lands.filter((land) => (landCorrect[land.id] ?? 0) >= passMark(land.count)).length;
}

/** Tickets paid for one finished land round. */
export function ticketsForRound(correct: number, count: number) {
  if (count <= 0 || correct < passMark(count)) return 0;
  return TICKETS_PER_PASS + (correct >= count ? PERFECT_BONUS : 0);
}

export type GameAccess =
  | { open: true; free: boolean }
  | { open: false; reason: "locked"; lands: number; need: number }
  | { open: false; reason: "tickets" };

export function gameAccess(game: FunGame, passed: number, tickets: number, owner: boolean): GameAccess {
  if (owner) return { open: true, free: true };
  if (passed < game.needLands) return { open: false, reason: "locked", lands: passed, need: game.needLands };
  if (tickets <= 0) return { open: false, reason: "tickets" };
  return { open: true, free: false };
}
