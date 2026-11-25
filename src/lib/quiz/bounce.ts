/**
 * Bouncy Ball: a rolling, jumping ball platformer. Rules, physics and levels only (no drawing).
 *
 * Tiles: # ground · R rubber (bounces you high) · ^ spikes · v ceiling spikes · ~ water
 *        o ring (collect them all to open the gate) · E gate · * crystal (checkpoint)
 *        + pump (big ball: floats in water, too big for low tunnels) · - deflate (small ball)
 *        x thorn moving sideways · y thorn moving up and down · | invisible wall for thorns
 *        L extra life · S start
 * One tile = 1 unit. y grows downwards.
 */

export const H = 14;
/** Top row of the ground. The ball rests in row GY - 1. */
export const GY = 11;

export const SMALL_R = 0.38;
export const BIG_R = 0.62;
const G = 32;
const ACC_GROUND = 32;
const ACC_AIR = 20;
const MAX_V = 6.5;
const MAX_V_WATER = 4.2;
export const JUMP_V = 12.5;
export const RUBBER_V = 16.8;
const BOX = 0.92; // collision box = this × diameter

export type LevelDef = { name: string; hint: string; rows: string[] };

/* ───────── level builder ───────── */

class Builder {
  grid: string[][];
  w: number;
  constructor(w: number) {
    this.w = w;
    this.grid = Array.from({ length: H }, () => Array<string>(w).fill(" "));
  }
  /** Ground from x0 to x1 (inclusive). */
  ground(x0: number, x1: number) {
    return this.fill(x0, x1, GY, H - 1, "#");
  }
  /** A hole in the ground. */
  pit(x0: number, x1: number) {
    return this.fill(x0, x1, GY, H - 1, " ");
  }
  /** Block from height h0 to h1 above the ground (1 = the row just above the ground). */
  block(x0: number, x1: number, h0: number, h1: number, ch = "#") {
    return this.fill(x0, x1, GY - h1, GY - h0, ch);
  }
  /** Put a tile at height h above the ground. */
  at(x: number, h: number, ch: string) {
    if (x >= 0 && x < this.w && GY - h >= 0 && GY - h < H) this.grid[GY - h]![x] = ch;
    return this;
  }
  fill(x0: number, x1: number, y0: number, y1: number, ch: string) {
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) this.grid[y]![x] = ch;
    return this;
  }
  gate(x: number) {
    return this.at(x, 1, "E").at(x, 2, "E");
  }
  rows() {
    return this.grid.map((r) => r.join(""));
  }
}

function level(name: string, hint: string, w: number, build: (b: Builder) => void): LevelDef {
  const b = new Builder(w);
  build(b);
  return { name, hint, rows: b.rows() };
}

export const LEVELS: LevelDef[] = [
  level("Roll and jump", "Roll with ◀ ▶ and jump with the big button. Collect every ring to open the gate.", 72, (b) => {
    b.ground(0, 71);
    b.at(2, 1, "S");
    b.at(8, 1, "o");
    b.block(12, 14, 1, 1).at(13, 2, "o");
    b.block(18, 20, 1, 2).at(19, 3, "o");
    b.pit(24, 26).at(25, 2, "o");
    b.at(31, 1, "*");
    b.at(36, 1, "^");
    b.at(42, 1, "^").at(43, 1, "^");
    b.block(48, 48, 1, 1).block(50, 54, 3, 3).at(52, 4, "o");
    b.at(58, 1, "L");
    b.gate(66);
  }),
  level("Rubber jungle", "Land on the blue rubber blocks to bounce extra high.", 84, (b) => {
    b.ground(0, 83);
    b.at(2, 1, "S");
    b.at(6, 1, "o");
    b.block(10, 10, 1, 1, "R");
    b.block(14, 19, 5, 5).at(16, 6, "o").at(18, 6, "*");
    b.block(24, 24, 1, 1, "R");
    b.block(27, 28, 1, 5).at(28, 6, "o");
    b.at(34, 1, "^").at(35, 1, "^");
    b.block(41, 41, 1, 1, "R").at(43, 6, "o");
    b.at(47, 1, "*");
    b.pit(51, 53);
    b.block(57, 57, 1, 1, "R");
    b.block(59, 64, 5, 5).at(61, 6, "o");
    b.at(66, 1, "^").at(67, 1, "^").at(68, 1, "^");
    b.gate(76);
  }),
  level("Thorny path", "Thorns roll back and forth. Time your jumps over them!", 92, (b) => {
    b.ground(0, 91);
    b.at(2, 1, "S");
    b.block(9, 9, 1, 1).block(21, 21, 1, 1).at(15, 1, "x").at(15, 3, "o");
    b.at(26, 1, "*");
    b.block(30, 32, 1, 2).at(31, 3, "o");
    b.pit(35, 37);
    b.at(36, 3, "o");
    b.block(40, 40, 1, 1).block(52, 52, 1, 1).at(44, 1, "x").at(48, 3, "x").at(40, 3, "|").at(52, 3, "|").at(46, 4, "o");
    b.at(56, 1, "*");
    b.block(60, 60, 1, 1, "R").block(63, 70, 5, 5).at(62, 6, "|").at(71, 6, "|").at(67, 6, "x").at(64, 6, "o").at(70, 6, "L");
    b.at(76, 1, "^").at(77, 1, "^");
    b.gate(85);
  }),
  level("Swim with the pump", "Roll over a pump ➕ to grow big: big balls float. Deflate ➖ to squeeze into low tunnels.", 96, (b) => {
    b.ground(0, 95);
    b.at(2, 1, "S");
    b.at(7, 1, "o");
    b.at(12, 1, "+");
    // a pool with spikes on the bottom
    b.fill(18, 36, GY, H - 2, "~").fill(18, 36, H - 1, H - 1, "^");
    b.at(27, 1, "o");
    b.at(41, 1, "*");
    b.at(46, 1, "-");
    // low tunnel: only the small ball fits
    b.block(51, 62, 2, 4).at(56, 1, "o");
    b.at(66, 1, "+");
    b.fill(70, 82, GY, H - 2, "~").fill(70, 82, H - 1, H - 1, "^");
    b.at(76, 1, "o");
    b.gate(90);
  }),
  level("Spiky caves", "Watch the ceiling! Tap jump quickly for a small hop under the spikes.", 96, (b) => {
    b.ground(0, 95);
    b.at(2, 1, "S");
    // cave roof with spikes hanging down
    b.block(10, 30, 5, 7);
    for (let x = 12; x <= 28; x += 4) b.at(x, 4, "v");
    b.at(16, 1, "^").at(24, 1, "^");
    b.at(14, 1, "o").at(20, 1, "o").at(27, 1, "o");
    b.at(34, 1, "*");
    b.at(38, 1, "-");
    b.block(42, 56, 2, 6).at(49, 1, "o");
    b.at(60, 1, "*");
    b.block(64, 64, 1, 1, "R").block(66, 74, 5, 5).at(70, 6, "o");
    b.block(66, 74, 9, 9);
    for (let x = 67; x <= 73; x += 3) b.at(x, 8, "v");
    b.pit(78, 80);
    b.gate(89);
  }),
  level("Bounce towers", "Tall walls! Use the rubber blocks to get over them.", 100, (b) => {
    b.ground(0, 99);
    b.at(2, 1, "S");
    b.block(8, 8, 1, 1, "R").block(11, 12, 1, 5).at(12, 6, "o");
    b.block(16, 16, 1, 1, "R").block(19, 20, 1, 5).at(19, 6, "o");
    b.pit(24, 27).at(25, 3, "o");
    b.at(31, 1, "*");
    b.block(35, 35, 1, 1).block(49, 49, 1, 1).at(39, 1, "x").at(45, 1, "x").at(42, 4, "o");
    b.at(53, 1, "+");
    b.fill(57, 70, GY, H - 2, "~").fill(57, 70, H - 1, H - 1, "^").at(63, 1, "o");
    b.at(74, 1, "*").at(77, 1, "-");
    b.block(80, 90, 2, 4).at(85, 1, "o");
    b.gate(95);
  }),
  level("Sky steps", "Hop from step to step. Don't fall!", 120, (b) => {
    b.ground(0, 15).pit(16, 95).ground(96, 119);
    b.at(2, 1, "S").at(8, 1, "o");
    b.block(18, 20, 2, 2);
    b.block(24, 26, 3, 3).at(25, 4, "o");
    b.block(30, 32, 2, 2);
    b.block(36, 36, 2, 2, "R");
    b.block(39, 43, 6, 6).at(41, 7, "o").at(42, 7, "*");
    b.block(47, 49, 4, 4);
    b.block(53, 62, 3, 3).at(52, 4, "|").at(63, 4, "|").at(58, 4, "x").at(60, 5, "o");
    b.block(66, 68, 3, 3);
    b.block(72, 74, 4, 4).at(73, 5, "o");
    b.block(78, 80, 3, 3).at(79, 4, "L");
    b.block(84, 86, 2, 2);
    b.block(90, 92, 1, 1);
    b.at(100, 1, "*");
    b.gate(112);
  }),
  level("The big finale", "Everything at once. You can do it!", 120, (b) => {
    b.ground(0, 119);
    b.at(2, 1, "S");
    b.block(8, 8, 1, 1, "R").block(11, 16, 5, 5).at(13, 6, "o");
    b.block(20, 20, 1, 1).block(30, 30, 1, 1).at(25, 1, "x").at(25, 3, "o");
    b.at(34, 1, "*");
    b.at(37, 1, "+");
    b.fill(42, 56, GY, H - 2, "~").fill(42, 56, H - 1, H - 1, "^").at(49, 1, "o");
    b.at(60, 1, "*").at(63, 1, "-");
    b.block(67, 76, 2, 5).at(71, 1, "o");
    b.pit(80, 82);
    b.at(81, 4, "y").at(81, 7, "|").at(81, 1, "|");
    b.at(86, 1, "*");
    b.block(90, 90, 1, 1, "R").block(93, 100, 5, 5).at(96, 6, "o").at(99, 6, "L");
    b.at(104, 1, "^").at(105, 1, "^").at(108, 1, "x").at(107, 1, "|").at(112, 1, "|");
    b.gate(114);
  }),
];

/* ───────── world ───────── */

export type Thorn = { x: number; y: number; dx: number; dy: number };
export type Item = { x: number; y: number; kind: "ring" | "crystal" | "life" | "pump" | "deflate"; taken: boolean };

export type World = {
  def: LevelDef;
  w: number;
  tiles: string[][];
  ball: { x: number; y: number; vx: number; vy: number; r: number; spin: number; onGround: boolean; inWater: boolean; jumping: boolean };
  items: Item[];
  thorns: Thorn[];
  start: { x: number; y: number };
  checkpoint: { x: number; y: number };
  ringsLeft: number;
  lives: number;
  score: number;
  won: boolean;
  dead: number; // seconds left of the "pop" before respawning, 0 when alive
  gameOver: boolean;
  time: number;
};

/** jump: pressed this frame. held: the jump button is down (let go early for a small hop). */
export type Input = { left: boolean; right: boolean; jump: boolean; held?: boolean };
export type Event = "jump" | "boing" | "ring" | "crystal" | "life" | "pump" | "deflate" | "die" | "win" | "gate";

export function loadWorld(def: LevelDef, lives = 3): World {
  const w = Math.max(...def.rows.map((r) => r.length));
  const tiles = def.rows.map((r) => r.padEnd(w, " ").split(""));
  const items: Item[] = [];
  const thorns: Thorn[] = [];
  let start = { x: 1.5, y: GY - SMALL_R };
  for (let y = 0; y < tiles.length; y++)
    for (let x = 0; x < w; x++) {
      const ch = tiles[y]![x]!;
      const kinds: Record<string, Item["kind"]> = { o: "ring", "*": "crystal", L: "life", "+": "pump", "-": "deflate" };
      if (kinds[ch]) {
        items.push({ x: x + 0.5, y: y + 0.5, kind: kinds[ch]!, taken: false });
        tiles[y]![x] = " ";
      } else if (ch === "x" || ch === "y") {
        thorns.push({ x: x + 0.5, y: y + 0.5, dx: ch === "x" ? 2 : 0, dy: ch === "y" ? 2.2 : 0 });
        tiles[y]![x] = " ";
      } else if (ch === "S") {
        start = { x: x + 0.5, y: y + 1 - SMALL_R };
        tiles[y]![x] = " ";
      }
    }
  const world: World = {
    def,
    w,
    tiles,
    ball: { x: start.x, y: start.y, vx: 0, vy: 0, r: SMALL_R, spin: 0, onGround: false, inWater: false, jumping: false },
    items,
    thorns,
    start,
    checkpoint: { ...start },
    ringsLeft: items.filter((i) => i.kind === "ring").length,
    lives,
    score: 0,
    won: false,
    dead: 0,
    gameOver: false,
    time: 0,
  };
  return world;
}

export function tileAt(w: World, x: number, y: number) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || tx >= w.w) return "#"; // side walls
  if (ty < 0) return " ";
  if (ty >= H) return " ";
  return w.tiles[ty]![tx]!;
}

function solid(w: World, ch: string) {
  return ch === "#" || ch === "R" || (ch === "E" && w.ringsLeft > 0);
}

function respawn(w: World) {
  const b = w.ball;
  b.x = w.checkpoint.x;
  b.y = w.checkpoint.y;
  b.vx = 0;
  b.vy = 0;
  b.r = SMALL_R;
  b.y = Math.min(b.y, Math.floor(b.y) + 1 - SMALL_R);
  b.onGround = false;
}

function die(w: World, events: Event[]) {
  if (w.dead || w.won) return;
  w.lives -= 1;
  w.dead = 0.9;
  events.push("die");
  if (w.lives <= 0) w.gameOver = true;
}

/** Move the ball along one axis, stopping at solid tiles. */
function moveAxis(w: World, axis: "x" | "y", amount: number, events: Event[]) {
  const b = w.ball;
  const half = b.r * BOX;
  if (axis === "x") b.x += amount;
  else b.y += amount;
  const x0 = Math.floor(b.x - half);
  const x1 = Math.floor(b.x + half - 1e-6);
  const y0 = Math.floor(b.y - half);
  const y1 = Math.floor(b.y + half - 1e-6);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      const ch = tileAt(w, tx, ty);
      if (!solid(w, ch)) continue;
      if (axis === "x") {
        if (amount > 0) b.x = tx - half;
        else if (amount < 0) b.x = tx + 1 + half;
        b.vx = 0;
      } else if (amount > 0) {
        b.y = ty - half;
        if (ch === "R") {
          b.vy = -RUBBER_V;
          events.push("boing");
        } else {
          if (b.vy > 7) {
            b.vy = -b.vy * 0.28;
            events.push("boing");
          } else b.vy = 0;
          b.onGround = true;
        }
      } else if (amount < 0) {
        b.y = ty + 1 + half;
        b.vy = Math.max(0, b.vy);
      }
      return;
    }
}

/** Can the ball grow here? (a big ball must not end up inside a wall) */
function roomFor(w: World, r: number) {
  const b = w.ball;
  const half = r * BOX;
  const cy = Math.min(b.y, Math.floor(b.y + b.r * BOX) - half); // stand on the same floor
  for (let ty = Math.floor(cy - half); ty <= Math.floor(cy + half - 1e-6); ty++)
    for (let tx = Math.floor(b.x - half); tx <= Math.floor(b.x + half - 1e-6); tx++) if (solid(w, tileAt(w, tx, ty))) return null;
  return cy;
}

export function step(w: World, input: Input, dt: number): Event[] {
  const events: Event[] = [];
  if (w.won || w.gameOver) return events;
  w.time += dt;
  // thorns move even while you respawn
  for (const t of w.thorns) {
    const nx = t.x + t.dx * dt;
    const ny = t.y + t.dy * dt;
    const ahead = tileAt(w, nx + Math.sign(t.dx) * 0.45, ny + Math.sign(t.dy) * 0.45);
    if (ahead === "#" || ahead === "R" || ahead === "|" || ahead === "E" || (t.dy && (ny < 0.5 || ny > H - 0.5))) {
      t.dx = -t.dx;
      t.dy = -t.dy;
    } else {
      t.x = nx;
      t.y = ny;
    }
  }
  if (w.dead) {
    w.dead = Math.max(0, w.dead - dt);
    if (!w.dead && !w.gameOver) respawn(w);
    return events;
  }
  const b = w.ball;
  const big = b.r > SMALL_R + 0.01;
  b.inWater = tileAt(w, b.x, b.y) === "~";
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const maxV = b.inWater ? MAX_V_WATER : MAX_V;
  const acc = b.onGround ? ACC_GROUND : ACC_AIR;
  if (dir) b.vx += dir * acc * dt;
  else {
    const drag = (b.onGround ? 16 : 3) * dt;
    b.vx = Math.abs(b.vx) <= drag ? 0 : b.vx - Math.sign(b.vx) * drag;
  }
  b.vx = Math.max(-maxV, Math.min(maxV, b.vx));
  // jumping: from the ground, or from the water's surface
  const surface = b.inWater && tileAt(w, b.x, b.y - b.r) !== "~";
  if (input.jump && (b.onGround || (b.inWater && (big ? surface : true)))) {
    b.vy = b.onGround ? -JUMP_V : big ? -10 : -6;
    b.onGround = false;
    b.jumping = !!b.vy && !b.inWater;
    events.push("jump");
  }
  if (b.vy >= 0) b.jumping = false;
  // let go of jump early: a smaller hop
  if (!input.held && b.jumping && b.vy < -5) {
    b.vy = -5;
    b.jumping = false;
  }
  // gravity, or floating in water
  if (b.inWater) {
    b.vy += (big ? -14 : 7) * dt;
    b.vy *= 1 - Math.min(1, 3 * dt);
  } else b.vy += G * dt;
  b.vy = Math.min(b.vy, 20);
  // move in small steps so we never pass through a tile
  const steps = Math.max(1, Math.ceil((Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt) / 0.2));
  const wasGround = b.onGround;
  b.onGround = false;
  for (let i = 0; i < steps; i++) {
    moveAxis(w, "x", (b.vx * dt) / steps, events);
    moveAxis(w, "y", (b.vy * dt) / steps, events);
  }
  // still standing on something?
  if (!b.onGround && wasGround && b.vy >= 0) {
    const below = tileAt(w, b.x, b.y + b.r * BOX + 0.02);
    if (solid(w, below) && below !== "R") b.onGround = true;
  }
  b.spin += (b.vx * dt) / b.r;

  // hazards
  const probe = (px: number, py: number) => tileAt(w, px, py);
  for (const [ox, oy] of [
    [0, b.r * 0.85],
    [b.r * 0.6, b.r * 0.6],
    [-b.r * 0.6, b.r * 0.6],
    [0, -b.r * 0.85],
    [b.r * 0.6, -b.r * 0.6],
    [-b.r * 0.6, -b.r * 0.6],
  ] as const) {
    const px = b.x + ox;
    const py = b.y + oy;
    const ch = probe(px, py);
    // floor spikes fill the lower part of their tile, ceiling spikes the upper part
    if (ch === "^" && py - Math.floor(py) > 0.35) die(w, events);
    if (ch === "v" && py - Math.floor(py) < 0.65) die(w, events);
  }
  for (const t of w.thorns) if (Math.hypot(t.x - b.x, t.y - b.y) < b.r + 0.36) die(w, events);
  if (b.y > H + 1) die(w, events);
  if (w.dead) return events;

  // items
  for (const it of w.items) {
    if (it.taken) {
      continue;
    }
    const d = Math.hypot(it.x - b.x, it.y - b.y);
    const reach = it.kind === "ring" ? 0.75 + b.r : 0.45 + b.r;
    if (d > reach) continue;
    if (it.kind === "ring") {
      it.taken = true;
      w.ringsLeft -= 1;
      w.score += 500;
      events.push("ring");
      if (!w.ringsLeft) events.push("gate");
    } else if (it.kind === "crystal") {
      it.taken = true;
      w.checkpoint = { x: it.x, y: Math.floor(it.y) + 1 - SMALL_R };
      w.score += 100;
      events.push("crystal");
    } else if (it.kind === "life") {
      it.taken = true;
      w.lives += 1;
      w.score += 200;
      events.push("life");
    } else if (it.kind === "pump" && !big) {
      const y = roomFor(w, BIG_R);
      if (y !== null) {
        b.r = BIG_R;
        b.y = y;
        events.push("pump");
      }
    } else if (it.kind === "deflate" && big) {
      b.r = SMALL_R;
      b.y = Math.floor(b.y + BIG_R * BOX) - SMALL_R * BOX;
      events.push("deflate");
    }
  }
  // the gate
  if (!w.ringsLeft) {
    for (const [ox, oy] of [
      [b.r, 0],
      [-b.r, 0],
      [0, 0],
    ] as const)
      if (tileAt(w, b.x + ox, b.y + oy) === "E") {
        w.won = true;
        w.score += 1000 + w.lives * 250;
        events.push("win");
        break;
      }
  }
  return events;
}
