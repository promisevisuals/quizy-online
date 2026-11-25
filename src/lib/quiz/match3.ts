/**
 * Sweet Swap: match-three rules with no drawing code, so they can be tested.
 *
 * Swap two neighbouring sweets to make a line of 3+ of one colour.
 *  - 4 in a line  → striped sweet (clears its whole row or column when it pops)
 *  - L or T shape → bomb (clears the 3×3 around it)
 *  - 5 in a line  → rainbow ball (swap it with a sweet to clear every sweet of that colour)
 * Specials swapped together make bigger blasts. Crates break when a match pops next to them.
 * Each level has a goal (score, collect a colour, or break all crates) and a number of moves.
 */

export const SIZE = 8;
export type Special = "row" | "col" | "bomb" | "rainbow" | null;
/** color: 0..5 for sweets, -1 for a crate, -2 for a rainbow ball. */
export type Piece = { id: number; color: number; special: Special; hits?: number };
export type Grid = (Piece | null)[][];
export type Pos = [number, number]; // [x, y]

export type Goal = { kind: "score"; target: number } | { kind: "collect"; color: number; count: number } | { kind: "crates"; count: number };

export type Level = { n: number; moves: number; colors: number; crates: number; goal: Goal; target: number };

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export type Match = {
  grid: Grid;
  level: Level;
  score: number;
  movesLeft: number;
  collected: number;
  cratesLeft: number;
  nextId: number;
  cascade: number;
  rng: () => number;
};

export const COLOR_NAMES = ["red", "orange", "yellow", "green", "blue", "purple"];

const MOVE_BONUS: Record<Difficulty, number> = { easy: 6, medium: 2, hard: 0, expert: -3 };

export function levelFor(n: number, difficulty: Difficulty = "medium"): Level {
  const colors = n <= (difficulty === "easy" ? 8 : 3) ? 5 : 6;
  const moves = Math.max(12, 22 - Math.floor(n / 4) + MOVE_BONUS[difficulty]);
  const kind = n % 3;
  let goal: Goal;
  let crates = 0;
  if (kind === 1) goal = { kind: "score", target: 1800 + n * 500 };
  else if (kind === 2) goal = { kind: "collect", color: n % colors, count: Math.min(45, 14 + n * 2) };
  else {
    crates = Math.min(20, 5 + n);
    goal = { kind: "crates", count: crates };
  }
  if (n > 6 && kind !== 0) crates = Math.min(8, Math.floor(n / 3));
  // the score that counts as "great" for stars
  const target = goal.kind === "score" ? goal.target : moves * 140;
  return { n, moves, colors, crates, goal, target };
}

function at(g: Grid, x: number, y: number) {
  return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? g[y]![x] : null;
}

function isSweet(p: Piece | null | undefined): p is Piece {
  return !!p && p.color >= 0;
}

function newPiece(m: Match, colors: number): Piece {
  return { id: m.nextId++, color: Math.floor(m.rng() * colors), special: null };
}

export function findRuns(g: Grid) {
  const runs: { cells: Pos[]; dir: "h" | "v" }[] = [];
  for (let y = 0; y < SIZE; y++) {
    let x = 0;
    while (x < SIZE) {
      const p = at(g, x, y);
      let end = x + 1;
      if (isSweet(p)) while (end < SIZE && isSweet(at(g, end, y)) && at(g, end, y)!.color === p.color) end++;
      if (isSweet(p) && end - x >= 3) runs.push({ cells: Array.from({ length: end - x }, (_, i) => [x + i, y] as Pos), dir: "h" });
      x = end;
    }
  }
  for (let x = 0; x < SIZE; x++) {
    let y = 0;
    while (y < SIZE) {
      const p = at(g, x, y);
      let end = y + 1;
      if (isSweet(p)) while (end < SIZE && isSweet(at(g, x, end)) && at(g, x, end)!.color === p.color) end++;
      if (isSweet(p) && end - y >= 3) runs.push({ cells: Array.from({ length: end - y }, (_, i) => [x, y + i] as Pos), dir: "v" });
      y = end;
    }
  }
  return runs;
}

function key([x, y]: Pos) {
  return y * SIZE + x;
}

export function newMatch(level: Level, rng: () => number = Math.random): Match {
  const m: Match = { grid: [], level, score: 0, movesLeft: level.moves, collected: 0, cratesLeft: 0, nextId: 1, cascade: 0, rng };
  for (let tries = 0; tries < 50; tries++) {
    m.grid = Array.from({ length: SIZE }, () => Array<Piece | null>(SIZE).fill(null));
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        let p: Piece;
        do {
          p = newPiece(m, level.colors);
        } while (
          (x >= 2 && at(m.grid, x - 1, y)?.color === p.color && at(m.grid, x - 2, y)?.color === p.color) ||
          (y >= 2 && at(m.grid, x, y - 1)?.color === p.color && at(m.grid, x, y - 2)?.color === p.color)
        );
        m.grid[y]![x] = p;
      }
    }
    // crates sit in the lower half
    let placed = 0;
    while (placed < level.crates) {
      const x = Math.floor(rng() * SIZE);
      const y = SIZE - 1 - Math.floor(rng() * Math.ceil(SIZE / 2));
      if (m.grid[y]![x]!.color === -1) continue;
      m.grid[y]![x] = { id: m.nextId++, color: -1, special: null, hits: 1 };
      placed++;
    }
    m.cratesLeft = placed;
    if (!findRuns(m.grid).length && findMove(m.grid)) break;
  }
  return m;
}

export function adjacent(a: Pos, b: Pos) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

function swapCells(g: Grid, a: Pos, b: Pos) {
  const t = g[a[1]]![a[0]]!;
  g[a[1]]![a[0]] = g[b[1]]![b[0]]!;
  g[b[1]]![b[0]] = t;
}

/** Would swapping a and b do something? (match, rainbow, or two specials) */
function swapWorks(g: Grid, a: Pos, b: Pos) {
  const pa = at(g, a[0], a[1]);
  const pb = at(g, b[0], b[1]);
  if (!pa || !pb || pa.color === -1 || pb.color === -1) return false;
  if (pa.special === "rainbow" || pb.special === "rainbow") return true;
  if (pa.special && pb.special) return true;
  swapCells(g, a, b);
  const ok = findRuns(g).length > 0;
  swapCells(g, a, b);
  return ok;
}

export function findMove(g: Grid): [Pos, Pos] | null {
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      if (x + 1 < SIZE && swapWorks(g, [x, y], [x + 1, y])) return [[x, y], [x + 1, y]];
      if (y + 1 < SIZE && swapWorks(g, [x, y], [x, y + 1])) return [[x, y], [x, y + 1]];
    }
  return null;
}

/** Cells a special clears when it goes off at (x, y). */
function blastCells(g: Grid, p: Piece, x: number, y: number, rng: () => number): Pos[] {
  const out: Pos[] = [];
  if (p.special === "row") for (let i = 0; i < SIZE; i++) out.push([i, y]);
  if (p.special === "col") for (let i = 0; i < SIZE; i++) out.push([x, i]);
  if (p.special === "bomb") for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push([x + dx, y + dy]);
  if (p.special === "rainbow") {
    const colors = new Set<number>();
    for (const row of g) for (const c of row) if (isSweet(c)) colors.add(c.color);
    const list = [...colors];
    const pickColor = list[Math.floor(rng() * list.length)];
    for (let yy = 0; yy < SIZE; yy++) for (let xx = 0; xx < SIZE; xx++) if (at(g, xx, yy)?.color === pickColor) out.push([xx, yy]);
  }
  return out.filter(([cx, cy]) => cx >= 0 && cy >= 0 && cx < SIZE && cy < SIZE);
}

export type Cleared = { piece: Piece; x: number; y: number };
export type Step = { cleared: Cleared[]; made: Pos[]; blasts: number; gained: number };

/**
 * Clear cells (and everything specials among them set off), hit crates, count goals and score.
 * `keep` are cells that become new specials and must not be cleared.
 */
function clearCells(m: Match, start: Pos[], keep: Set<number>, made: Pos[]): Step {
  const g = m.grid;
  const queue = [...start];
  const seen = new Set<number>();
  const cleared: Cleared[] = [];
  let blasts = 0;
  const crateHits = new Set<number>();
  while (queue.length) {
    const pos = queue.shift()!;
    const k = key(pos);
    if (seen.has(k) || keep.has(k)) continue;
    seen.add(k);
    const p = at(g, pos[0], pos[1]);
    if (!p) continue;
    if (p.color === -1) {
      crateHits.add(k);
      continue;
    }
    cleared.push({ piece: p, x: pos[0], y: pos[1] });
    if (p.special) {
      blasts++;
      queue.push(...blastCells(g, p, pos[0], pos[1], m.rng));
    }
    // matches next to a crate crack it
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = at(g, pos[0] + dx, pos[1] + dy);
      if (n?.color === -1) crateHits.add(key([pos[0] + dx, pos[1] + dy]));
    }
  }
  for (const c of cleared) g[c.y]![c.x] = null;
  for (const k of crateHits) {
    const x = k % SIZE;
    const y = Math.floor(k / SIZE);
    const crate = g[y]![x];
    if (crate?.color !== -1) continue;
    crate.hits = (crate.hits ?? 1) - 1;
    if (crate.hits <= 0) {
      cleared.push({ piece: crate, x, y });
      g[y]![x] = null;
      m.cratesLeft = Math.max(0, m.cratesLeft - 1);
    }
  }
  const goal = m.level.goal;
  if (goal.kind === "collect") m.collected += cleared.filter((c) => c.piece.color === goal.color).length;
  const mult = 1 + m.cascade * 0.5;
  const gained = Math.round(cleared.length * 20 * mult + blasts * 60 + made.length * 40);
  m.score += gained;
  return { cleared, made, blasts, gained };
}

/**
 * Try a swap. Returns null if it does nothing (the sweets go back), or the first clear step.
 * Uses up a move when it works.
 */
export function trySwap(m: Match, a: Pos, b: Pos): Step | null {
  if (!adjacent(a, b) || !swapWorks(m.grid, a, b)) return null;
  const g = m.grid;
  const pa = at(g, a[0], a[1])!;
  const pb = at(g, b[0], b[1])!;
  m.movesLeft -= 1;
  m.cascade = 0;
  // rainbow ball: clear every sweet of the other's colour (or everything, for two rainbows)
  if (pa.special === "rainbow" || pb.special === "rainbow") {
    const rainbow = pa.special === "rainbow" ? a : b;
    const other = pa.special === "rainbow" ? pb : pa;
    const cells: Pos[] = [rainbow];
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const p = at(g, x, y);
        if (!p || p.color === -1) continue;
        if (other.special === "rainbow" || p.color === other.color) {
          // a striped or bomb partner turns all of that colour into its kind before it goes off
          if (other.special && other.special !== "rainbow" && p.special === null) p.special = other.special === "bomb" ? "bomb" : (x + y) % 2 ? "row" : "col";
          cells.push([x, y]);
        }
      }
    g[rainbow[1]]![rainbow[0]]!.special = null; // it's used up, not set off again
    return clearCells(m, cells, new Set(), []);
  }
  // two specials together
  if (pa.special && pb.special) {
    const [x, y] = b;
    const cells: Pos[] = [a, b];
    const kinds = [pa.special, pb.special];
    pa.special = null;
    pb.special = null;
    if (kinds.includes("bomb") && (kinds.includes("row") || kinds.includes("col"))) {
      for (let d = -1; d <= 1; d++) for (let i = 0; i < SIZE; i++) cells.push([i, y + d], [x + d, i]);
    } else if (kinds[0] === "bomb" && kinds[1] === "bomb") {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) cells.push([x + dx, y + dy]);
    } else {
      for (let i = 0; i < SIZE; i++) cells.push([i, y], [x, i]);
    }
    return clearCells(
      m,
      cells.filter(([cx, cy]) => cx >= 0 && cy >= 0 && cx < SIZE && cy < SIZE),
      new Set(),
      [],
    );
  }
  swapCells(g, a, b);
  return matchStep(m, [a, b]);
}

/** Clear the current matches (making specials). Returns null when the board is settled. */
export function matchStep(m: Match, swapped: Pos[] = []): Step | null {
  const g = m.grid;
  const runs = findRuns(g);
  if (!runs.length) return null;
  // group runs that touch (L and T shapes)
  const groups: { cells: Map<number, Pos>; runs: typeof runs }[] = [];
  for (const run of runs) {
    const hit = groups.filter((gr) => run.cells.some((c) => gr.cells.has(key(c))));
    const merged = { cells: new Map<number, Pos>(), runs: [run] };
    for (const c of run.cells) merged.cells.set(key(c), c);
    for (const gr of hit) {
      for (const [k, c] of gr.cells) merged.cells.set(k, c);
      merged.runs.push(...gr.runs);
      groups.splice(groups.indexOf(gr), 1);
    }
    groups.push(merged);
  }
  const keep = new Set<number>();
  const made: Pos[] = [];
  const toClear: Pos[] = [];
  for (const gr of groups) {
    const longest = Math.max(...gr.runs.map((r) => r.cells.length));
    const hasH = gr.runs.some((r) => r.dir === "h");
    const hasV = gr.runs.some((r) => r.dir === "v");
    let special: Special = null;
    if (longest >= 5) special = "rainbow";
    else if (hasH && hasV) special = "bomb";
    else if (longest === 4) special = gr.runs[0]!.dir === "h" ? "row" : "col";
    if (special) {
      const cells = [...gr.cells.values()];
      const plain = cells.filter(([x, y]) => !at(g, x, y)!.special);
      let spot = swapped.find((s) => gr.cells.has(key(s)) && plain.some((p) => key(p) === key(s)));
      if (!spot && special === "bomb") {
        const h = gr.runs.find((r) => r.dir === "h")!;
        spot = gr.runs.find((r) => r.dir === "v")!.cells.find((c) => h.cells.some((d) => key(d) === key(c)));
        if (spot && at(g, spot[0], spot[1])!.special) spot = undefined;
      }
      spot ??= plain[Math.floor(plain.length / 2)];
      if (spot) {
        const p = at(g, spot[0], spot[1])!;
        g[spot[1]]![spot[0]] = { id: m.nextId++, color: special === "rainbow" ? -2 : p.color, special };
        keep.add(key(spot));
        made.push(spot);
        // the old sweet still counts for a collect goal
        if (m.level.goal.kind === "collect" && p.color === m.level.goal.color) m.collected += 1;
      }
    }
    for (const c of gr.cells.values()) toClear.push(c);
  }
  const step = clearCells(m, toClear, keep, made);
  m.cascade += 1;
  return step;
}

/** Let everything fall and fill the gaps from the top. */
export function collapse(m: Match) {
  const g = m.grid;
  for (let x = 0; x < SIZE; x++) {
    const stack: Piece[] = [];
    for (let y = SIZE - 1; y >= 0; y--) if (g[y]![x]) stack.push(g[y]![x]!);
    for (let y = SIZE - 1, i = 0; y >= 0; y--, i++) g[y]![x] = stack[i] ?? newPiece(m, m.level.colors);
  }
}

/** If no move is left, mix the sweets until there is one. Returns true if it shuffled. */
export function ensureMove(m: Match) {
  if (findMove(m.grid)) return false;
  const g = m.grid;
  const spots: Pos[] = [];
  const pieces: Piece[] = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if (isSweet(g[y]![x])) {
        spots.push([x, y]);
        pieces.push(g[y]![x]!);
      }
  for (let tries = 0; tries < 200; tries++) {
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(m.rng() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j]!, pieces[i]!];
    }
    spots.forEach(([x, y], i) => (g[y]![x] = pieces[i]!));
    if (!findRuns(g).length && findMove(g)) return true;
  }
  // very unlikely: fresh sweets
  for (const [x, y] of spots) g[y]![x] = newPiece(m, m.level.colors);
  return true;
}

export function goalDone(m: Match) {
  const goal = m.level.goal;
  if (goal.kind === "score") return m.score >= goal.target;
  if (goal.kind === "collect") return m.collected >= goal.count;
  return m.cratesLeft <= 0;
}

export function goalProgress(m: Match): { have: number; need: number } {
  const goal = m.level.goal;
  if (goal.kind === "score") return { have: Math.min(m.score, goal.target), need: goal.target };
  if (goal.kind === "collect") return { have: Math.min(m.collected, goal.count), need: goal.count };
  return { have: goal.count - m.cratesLeft, need: goal.count };
}

/** Stars for a won level: 1 for the goal, more for a big score. */
export function stars(m: Match) {
  if (!goalDone(m)) return 0;
  const t = m.level.target;
  return m.score >= t * 1.6 ? 3 : m.score >= t * 1.2 ? 2 : 1;
}

export function seededRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}
