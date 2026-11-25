/**
 * Brick Drop: the falling-bricks game rules, with no drawing code so they can be tested.
 * Seven brick shapes, turning with wall kicks, a fair "bag" of pieces, hold, ghost piece,
 * lock delay, line clears, levels and scoring.
 */

export const COLS = 10;
export const ROWS = 20;
/** Rows above the visible board where new bricks appear. */
export const HIDDEN = 2;
export const TOTAL_ROWS = ROWS + HIDDEN;

export type Kind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export const KINDS: Kind[] = ["I", "O", "T", "S", "Z", "J", "L"];

type Cell = [number, number];

/** Spawn shapes inside their box (x right, y down). */
const BASE: Record<Kind, { n: number; cells: Cell[] }> = {
  I: { n: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { n: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { n: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { n: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { n: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { n: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { n: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

function rotateCells(cells: Cell[], n: number, times: number): Cell[] {
  let out = cells;
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) out = out.map(([x, y]) => [n - 1 - y, x] as Cell);
  return out;
}

const SHAPES: Record<Kind, Cell[][]> = Object.fromEntries(
  KINDS.map((k) => [k, [0, 1, 2, 3].map((r) => rotateCells(BASE[k].cells, BASE[k].n, k === "O" ? 0 : r))]),
) as Record<Kind, Cell[][]>;

/** Standard wall kicks (x right, y UP as in the usual tables; flipped when applied). */
const KICKS: Record<string, Cell[]> = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I: Record<string, Cell[]> = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export type Piece = { kind: Kind; rot: number; x: number; y: number };
export type Board = (Kind | null)[][];

export type Game = {
  board: Board;
  piece: Piece | null;
  queue: Kind[];
  bag: Kind[];
  hold: Kind | null;
  canHold: boolean;
  score: number;
  lines: number;
  startLevel: number;
  level: number;
  over: boolean;
  /** ms since the last fall */
  fallAcc: number;
  /** ms the piece has been resting on something */
  lockAcc: number;
  lockResets: number;
  /** Lines cleared by the last lock (for sounds and the flash). */
  lastClear: number[];
  combo: number;
  rng: () => number;
};

export const LOCK_MS = 500;
export const MAX_LOCK_RESETS = 15;

export function emptyBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () => Array<Kind | null>(COLS).fill(null));
}

export function cellsOf(p: Piece): Cell[] {
  return SHAPES[p.kind][p.rot]!.map(([x, y]) => [x + p.x, y + p.y] as Cell);
}

export function collides(board: Board, p: Piece) {
  return cellsOf(p).some(([x, y]) => x < 0 || x >= COLS || y >= TOTAL_ROWS || (y >= 0 && board[y]![x] !== null));
}

function refillBag(rng: () => number): Kind[] {
  const bag = [...KINDS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return bag;
}

function pull(g: Game): Kind {
  while (g.queue.length < 4) {
    if (!g.bag.length) g.bag = refillBag(g.rng);
    g.queue.push(g.bag.shift()!);
  }
  const k = g.queue.shift()!;
  if (!g.bag.length) g.bag = refillBag(g.rng);
  g.queue.push(g.bag.shift()!);
  return k;
}

function spawnPiece(kind: Kind): Piece {
  return { kind, rot: 0, x: kind === "O" ? 4 : 3, y: HIDDEN - 1 };
}

function spawn(g: Game, kind: Kind) {
  const p = spawnPiece(kind);
  g.fallAcc = 0;
  g.lockAcc = 0;
  g.lockResets = 0;
  if (collides(g.board, p)) {
    g.piece = p;
    g.over = true;
    return;
  }
  g.piece = p;
}

export function newGame(startLevel = 1, rng: () => number = Math.random): Game {
  const g: Game = {
    board: emptyBoard(),
    piece: null,
    queue: [],
    bag: [],
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    startLevel,
    level: startLevel,
    over: false,
    fallAcc: 0,
    lockAcc: 0,
    lockResets: 0,
    lastClear: [],
    combo: -1,
    rng,
  };
  spawn(g, pull(g));
  return g;
}

/** Time between falls: gentle at level 1, quick by level 15. */
export function gravityMs(level: number) {
  return Math.max(60, Math.round(1000 * Math.pow(0.85, Math.max(0, level - 1))));
}

function grounded(g: Game) {
  return !!g.piece && collides(g.board, { ...g.piece, y: g.piece.y + 1 });
}

function touched(g: Game) {
  // moving or turning while resting buys a little more time, up to a limit
  if (grounded(g) && g.lockResets < MAX_LOCK_RESETS) {
    g.lockAcc = 0;
    g.lockResets += 1;
  }
}

export function move(g: Game, dx: number) {
  if (!g.piece || g.over) return false;
  const next = { ...g.piece, x: g.piece.x + dx };
  if (collides(g.board, next)) return false;
  g.piece = next;
  touched(g);
  return true;
}

export function rotate(g: Game, dir: 1 | -1) {
  if (!g.piece || g.over || g.piece.kind === "O") return false;
  const from = g.piece.rot;
  const to = (from + dir + 4) % 4;
  const table = g.piece.kind === "I" ? KICKS_I : KICKS;
  for (const [kx, ky] of table[`${from}>${to}`]!) {
    const next = { ...g.piece, rot: to, x: g.piece.x + kx, y: g.piece.y - ky };
    if (!collides(g.board, next)) {
      g.piece = next;
      touched(g);
      return true;
    }
  }
  return false;
}

/** Push down one row. Returns true if it moved. */
export function softDrop(g: Game) {
  if (!g.piece || g.over) return false;
  const next = { ...g.piece, y: g.piece.y + 1 };
  if (collides(g.board, next)) return false;
  g.piece = next;
  g.score += 1;
  g.fallAcc = 0;
  return true;
}

export function ghostY(g: Game) {
  if (!g.piece) return 0;
  let y = g.piece.y;
  while (!collides(g.board, { ...g.piece, y: y + 1 })) y++;
  return y;
}

export const LINE_SCORES = [0, 100, 300, 500, 800];

function lock(g: Game) {
  const p = g.piece;
  if (!p) return;
  for (const [x, y] of cellsOf(p)) if (y >= 0) g.board[y]![x] = p.kind;
  // a piece locked fully above the visible board ends the game
  const allHidden = cellsOf(p).every(([, y]) => y < HIDDEN);
  const full: number[] = [];
  for (let y = 0; y < TOTAL_ROWS; y++) if (g.board[y]!.every((c) => c !== null)) full.push(y);
  if (full.length) {
    g.board = [...full.map(() => Array<Kind | null>(COLS).fill(null)), ...g.board.filter((_, y) => !full.includes(y))];
    g.combo += 1;
    g.score += LINE_SCORES[full.length]! * g.level + (g.combo > 0 ? 50 * g.combo * g.level : 0);
    g.lines += full.length;
    g.level = g.startLevel + Math.floor(g.lines / 10);
  } else {
    g.combo = -1;
  }
  g.lastClear = full;
  g.piece = null;
  g.canHold = true;
  if (allHidden && !full.length) {
    g.over = true;
    return;
  }
  spawn(g, pull(g));
}

/** Slam the piece to the bottom and lock it. Returns the rows cleared. */
export function hardDrop(g: Game) {
  if (!g.piece || g.over) return [];
  const y = ghostY(g);
  g.score += 2 * (y - g.piece.y);
  g.piece = { ...g.piece, y };
  lock(g);
  return g.lastClear;
}

export function hold(g: Game) {
  if (!g.piece || g.over || !g.canHold) return false;
  const current = g.piece.kind;
  if (g.hold) {
    const swap = g.hold;
    g.hold = current;
    spawn(g, swap);
  } else {
    g.hold = current;
    spawn(g, pull(g));
  }
  g.canHold = false;
  return true;
}

/**
 * Advance time. Returns "lock" when a piece locked this tick (check g.lastClear),
 * "fall" when it dropped a row, or null.
 */
export function tick(g: Game, dt: number): "lock" | "fall" | null {
  if (!g.piece || g.over) return null;
  if (grounded(g)) {
    g.lockAcc += dt;
    if (g.lockAcc >= LOCK_MS) {
      lock(g);
      return "lock";
    }
    return null;
  }
  g.lockAcc = 0;
  g.fallAcc += dt;
  const ms = gravityMs(g.level);
  let fell = false;
  while (g.fallAcc >= ms && g.piece && !grounded(g)) {
    g.fallAcc -= ms;
    g.piece = { ...g.piece, y: g.piece.y + 1 };
    fell = true;
  }
  if (grounded(g)) g.fallAcc = 0;
  return fell ? "fall" : null;
}

/** Cells of a kind in its spawn turn, for drawing the next and hold boxes. */
export function previewCells(kind: Kind): Cell[] {
  return SHAPES[kind][0]!;
}

export const BRICK_COLORS: Record<Kind, string> = {
  I: "#2bb5c9",
  O: "#f2c230",
  T: "#9b5bd6",
  S: "#3fb661",
  Z: "#e2483f",
  J: "#3d6fd9",
  L: "#ef8a2a",
};

/** Seeded random numbers, so tests and replays are repeatable. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}
