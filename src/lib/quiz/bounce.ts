/**
 * Bouncy Ball: a rolling, jumping ball platformer in three worlds, each ending with a boss.
 * Rules, physics and levels only (no drawing), so it can be tested.
 *
 * Tiles: # ground · R rubber (bounces you high) · ^ spikes · v ceiling spikes · ~ water · = lava
 *        o ring (collect them all to open the gate) · E gate · * crystal (checkpoint)
 *        + pump (big ball floats; too big for low tunnels) · - deflate (small ball)
 *        g gem (50 gems = extra life) · L extra life
 *        ? block with a gem · P block with a power-up (see LevelDef.powers) · k used block
 *        c crumbling block (breaks soon after you land on it, comes back later)
 *        x thorn moving sideways · y thorn moving up and down · | invisible wall for thorns, bugs, platforms
 *        b bug (jump on it!) · C cannon · D falling stone (drops when you pass under it)
 *        m moving platform (sideways) · n moving platform (up and down)
 *        U shield · F fire · W wings (double jump) · T star (invincible for a while)
 *        B boss · S start
 * One tile = 1 unit. y grows downwards.
 */

export const H = 14;
/** Top row of the ground. The ball rests in row GY - 1. */
export const GY = 11;

export const SMALL_R = 0.38;
export const BIG_R = 0.62;
const G = 32;
const ACC_GROUND = 34;
const ACC_AIR = 22;
const MAX_V = 6.8;
const MAX_V_WATER = 4.2;
export const JUMP_V = 14.5;
export const RUBBER_V = 18.5;
const STOMP_V = 11;
const BOX = 0.92; // collision box = this × diameter
const COYOTE = 0.09;
const BUFFER = 0.13;
export const HURT_TIME = 2.2;
export const STAR_TIME = 9;
const FIRE_GAP = 0.28;

export type Power = "U" | "F" | "W" | "T";
export type LevelDef = { name: string; hint: string; rows: string[]; world: 1 | 2 | 3; boss?: string; powers?: Power[] };

export const WORLD_NAMES = ["", "Jungle", "Crystal Caves", "Volcano"];

/* ───────── level builder ───────── */

class Builder {
  grid: string[][];
  w: number;
  constructor(w: number) {
    this.w = w;
    this.grid = Array.from({ length: H }, () => Array<string>(w).fill(" "));
  }
  ground(x0: number, x1: number) {
    return this.fill(x0, x1, GY, H - 1, "#");
  }
  pit(x0: number, x1: number) {
    return this.fill(x0, x1, GY, H - 1, " ");
  }
  /** Lava instead of ground: falling in is the end. */
  lava(x0: number, x1: number) {
    return this.fill(x0, x1, GY, GY, " ").fill(x0, x1, GY + 1, H - 1, "=");
  }
  /** A column of ground standing h tiles above the ground line, down to the bottom of the map. */
  pillar(x0: number, x1: number, h: number) {
    return this.fill(x0, x1, GY - h, H - 1, "#");
  }
  /** Block from height h0 to h1 above the ground (1 = the row just above the ground). */
  block(x0: number, x1: number, h0: number, h1: number, ch = "#") {
    return this.fill(x0, x1, GY - h1, GY - h0, ch);
  }
  at(x: number, h: number, ch: string) {
    if (x >= 0 && x < this.w && GY - h >= 0 && GY - h < H) this.grid[GY - h]![x] = ch;
    return this;
  }
  row(x0: number, x1: number, h: number, ch: string, step = 1) {
    for (let x = x0; x <= x1; x += step) this.at(x, h, ch);
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

function level(name: string, hint: string, w: number, world: 1 | 2 | 3, build: (b: Builder) => void, extra: Partial<LevelDef> = {}): LevelDef {
  const b = new Builder(w);
  build(b);
  return { name, hint, rows: b.rows(), world, ...extra };
}

/** A boss arena: flat floor, two ledges, invisible boss walls at the edges, the gate past the right wall. */
function arena(b: Builder, from: number) {
  b.at(from, 1, "|").at(from, 2, "|").at(from, 3, "|");
  b.at(from + 31, 1, "|").at(from + 31, 2, "|").at(from + 31, 3, "|");
  b.block(from + 5, from + 7, 3, 3);
  b.block(from + 24, from + 26, 3, 3);
  b.at(from + 20, 1, "B");
  b.gate(from + 35);
}

export const LEVELS: LevelDef[] = [
  /* ───────── World 1: Jungle ───────── */
  level("Roll and jump", "Roll with ◀ ▶ and jump with the big button. Collect every ring to open the gate. Bump ? blocks from below!", 72, 1, (b) => {
    b.ground(0, 71);
    b.at(2, 1, "S");
    b.at(8, 1, "o").row(5, 7, 1, "g");
    b.block(12, 14, 1, 1).at(13, 2, "o");
    b.block(18, 20, 1, 2).at(19, 3, "o");
    b.pit(24, 26).at(25, 2, "o");
    b.at(29, 4, "?").at(30, 4, "?");
    b.at(33, 1, "*");
    b.at(37, 1, "^").row(36, 38, 3, "g");
    b.at(42, 1, "^").at(43, 1, "^");
    b.block(48, 48, 1, 1).block(50, 54, 3, 3).at(52, 4, "o").row(50, 54, 4, "g", 2);
    b.at(58, 1, "L");
    b.gate(66);
  }),
  level("Rubber jungle", "Land on the blue rubber blocks to bounce extra high.", 84, 1, (b) => {
    b.ground(0, 83);
    b.at(2, 1, "S");
    b.at(6, 1, "o");
    b.block(10, 10, 1, 1, "R");
    b.block(14, 19, 5, 5).at(16, 6, "o").at(18, 6, "*").at(15, 6, "g").at(19, 6, "g");
    b.block(24, 24, 1, 1, "R");
    b.block(27, 28, 1, 5).at(28, 6, "o");
    b.at(34, 1, "^").at(35, 1, "^");
    b.block(41, 41, 1, 1, "R").at(43, 6, "o");
    b.at(47, 1, "*");
    b.pit(51, 53);
    b.block(57, 57, 1, 1, "R");
    b.block(59, 64, 5, 5).at(61, 6, "o").at(63, 6, "g");
    b.at(66, 1, "^").at(67, 1, "^").at(68, 1, "^");
    b.gate(76);
  }),
  level("Thorny path", "Thorns roll back and forth. Time your jumps over them!", 92, 1, (b) => {
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
    b.at(76, 1, "^").at(77, 1, "^").row(75, 78, 3, "g");
    b.gate(85);
  }),
  level("Swim with the pump", "Roll over a pump ➕ to grow big: big balls float. Deflate ➖ to squeeze into low tunnels.", 96, 1, (b) => {
    b.ground(0, 95);
    b.at(2, 1, "S");
    b.at(7, 1, "o");
    b.at(12, 1, "+");
    b.fill(18, 36, GY, H - 2, "~").fill(18, 36, H - 1, H - 1, "^");
    b.at(27, 1, "o").row(21, 33, 2, "g", 4);
    b.at(41, 1, "*");
    b.at(46, 1, "-");
    b.block(51, 62, 2, 4).at(56, 1, "o").row(52, 61, 1, "g", 3);
    b.at(66, 1, "+");
    b.fill(70, 82, GY, H - 2, "~").fill(70, 82, H - 1, H - 1, "^");
    b.at(76, 1, "o");
    b.gate(90);
  }),
  level("Bounce towers", "Tall walls! Use the rubber blocks to get over them.", 100, 1, (b) => {
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
  level("Bug meadow", "Jump on bugs to squash them! Bump the glowing block for a shield: it saves you from one hit.", 100, 1, (b) => {
    b.ground(0, 99);
    b.at(2, 1, "S").row(5, 9, 1, "g");
    b.at(12, 4, "?");
    b.block(14, 14, 1, 1).block(26, 26, 1, 1).at(19, 1, "b").row(18, 22, 3, "g");
    b.at(20, 4, "o");
    b.at(30, 4, "P");
    b.block(34, 34, 1, 1).block(48, 48, 1, 1).at(38, 1, "b").at(43, 1, "b");
    b.at(41, 4, "o");
    b.block(50, 50, 1, 2).row(53, 55, 4, "?").at(58, 3, "o");
    b.at(61, 1, "*");
    b.pit(64, 66);
    b.block(70, 75, 1, 2).at(71, 3, "b").at(74, 3, "o");
    b.block(78, 78, 1, 1).block(89, 89, 1, 1).at(83, 1, "x").row(80, 87, 4, "g", 2);
    b.at(92, 1, "o");
    b.gate(96);
  }, { powers: ["U"] }),
  level("Boss: Thorn King", "The Thorn King blocks the way! Jump on his head three times. Don't touch his sides.", 56, 1, (b) => {
    b.ground(0, 55);
    b.at(2, 1, "S").row(4, 7, 1, "g");
    b.at(9, 4, "P");
    arena(b, 14);
  }, { powers: ["U"], boss: "Thorn King" }),

  /* ───────── World 2: Crystal Caves ───────── */
  level("Spiky caves", "Watch the ceiling! Tap jump quickly for a small hop under the spikes.", 96, 2, (b) => {
    b.ground(0, 95);
    b.at(2, 1, "S");
    b.block(10, 30, 5, 7);
    for (let x = 12; x <= 28; x += 4) b.at(x, 4, "v");
    b.at(16, 1, "^").at(24, 1, "^");
    b.at(14, 1, "o").at(20, 1, "o").at(27, 1, "o");
    b.at(34, 1, "*");
    b.at(38, 1, "-");
    b.block(42, 56, 2, 6).at(49, 1, "o").row(44, 54, 1, "g", 2);
    b.at(60, 1, "*");
    b.block(64, 64, 1, 1, "R").block(66, 74, 5, 5).at(70, 6, "o");
    b.block(66, 74, 9, 9);
    for (let x = 67; x <= 73; x += 3) b.at(x, 8, "v");
    b.pit(78, 80);
    b.gate(89);
  }),
  level("Fire power", "Grab the fire pepper and press 🔥 to spit fire at thorns, bugs and cannon shots.", 104, 2, (b) => {
    b.ground(0, 103);
    b.at(2, 1, "S");
    b.at(8, 1, "F");
    b.block(12, 12, 1, 1).block(22, 22, 1, 1).at(16, 1, "x").at(17, 4, "o");
    b.at(30, 4, "o").row(26, 32, 1, "g", 2);
    b.block(34, 34, 1, 2, "C");
    b.block(38, 40, 1, 2);
    b.block(43, 43, 1, 1).block(58, 58, 1, 1).at(47, 1, "b").at(51, 1, "b").at(55, 1, "b").at(50, 4, "o");
    b.at(62, 1, "*");
    b.block(64, 74, 8, 9).at(67, 7, "D").at(71, 7, "D").row(65, 73, 1, "g", 2);
    b.at(78, 4, "P");
    b.pit(84, 86);
    b.at(85, 4, "y").at(85, 7, "|").at(85, 0, "|");
    b.at(91, 1, "o");
    b.gate(98);
  }, { powers: ["F"] }),
  level("Moving rocks", "Ride the moving rocks over the gap. Look up: stones fall!", 110, 2, (b) => {
    b.ground(0, 14).pit(15, 95).ground(96, 109);
    b.at(2, 1, "S").at(8, 1, "o");
    b.at(18, 2, "m").at(16, 2, "|").at(30, 2, "|");
    b.block(32, 34, 2, 2).at(33, 3, "o");
    b.at(37, 1, "n").at(37, 7, "|").at(37, 0, "|");
    b.block(41, 44, 6, 6).at(42, 7, "o").at(44, 7, "g");
    b.block(48, 52, 3, 3).block(48, 52, 9, 9).at(50, 8, "D");
    b.at(56, 3, "m").at(54, 3, "|").at(68, 3, "|").at(62, 5, "o");
    b.block(70, 72, 3, 3).at(71, 4, "*");
    b.at(75, 2, "m").at(73, 2, "|").at(86, 2, "|");
    b.at(80, 6, "x").at(76, 6, "|").at(85, 6, "|");
    b.block(89, 91, 2, 2).at(90, 3, "o");
    b.gate(104);
  }),
  level("Sky steps", "Hop from step to step. Don't fall!", 120, 2, (b) => {
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
  level("Crumble bridge", "The cracked blocks crumble after you land. Keep rolling! Wings give you a second jump in the air.", 110, 2, (b) => {
    b.ground(0, 12).pit(13, 100).ground(101, 109);
    b.at(2, 1, "S").at(9, 1, "W");
    b.row(14, 30, 1, "c").at(22, 3, "o").row(16, 28, 2, "g", 4);
    b.block(31, 33, 1, 1).at(32, 2, "*");
    b.block(36, 37, 2, 2, "c").block(40, 41, 3, 3, "c").block(44, 45, 4, 4, "c").at(45, 6, "o").block(48, 49, 3, 3, "c");
    b.block(53, 56, 1, 2).at(56, 3, "C");
    b.row(58, 75, 1, "c").at(66, 3, "o");
    b.block(77, 79, 1, 2).at(78, 3, "o");
    b.at(82, 2, "m").at(80, 2, "|").at(97, 2, "|").at(90, 4, "o");
    b.gate(105);
  }),
  level("Cave run", "A long run through the caves. You can do it!", 120, 2, (b) => {
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
  level("Boss: Crystal Crusher", "The Crystal Crusher spits thorn balls. Jump over them, then bounce on its head five times!", 56, 2, (b) => {
    b.ground(0, 55);
    b.at(2, 1, "S").row(4, 6, 1, "g");
    b.at(7, 4, "P").at(10, 4, "P");
    arena(b, 14);
  }, { powers: ["U", "F"], boss: "Crystal Crusher" }),

  /* ───────── World 3: Volcano ───────── */
  level("Lava lake", "Lava! Hop across the rocks and ride the platforms. Watch out for jumping fireballs.", 110, 3, (b) => {
    b.ground(0, 12).lava(13, 97).ground(98, 109);
    b.at(2, 1, "S").at(8, 1, "o");
    b.pillar(16, 17, 1).pillar(21, 22, 2).pillar(27, 28, 1).at(22, 3, "o");
    b.at(25, 4, "y").at(25, 8, "|").at(25, -1, "|");
    b.at(32, 2, "m").at(30, 2, "|").at(44, 2, "|").row(34, 42, 4, "g", 2);
    b.pillar(46, 47, 2).at(46, 3, "o");
    b.pillar(51, 52, 3).pillar(56, 57, 2).at(54, 5, "y").at(54, 9, "|").at(54, -1, "|");
    b.pillar(60, 63, 2).at(61, 3, "*");
    b.at(67, 2, "n").at(67, 7, "|").at(67, -1, "|");
    b.pillar(72, 75, 4).at(73, 5, "o");
    b.pillar(79, 80, 3).pillar(84, 85, 2).pillar(90, 91, 2).at(87, 4, "y").at(87, 8, "|").at(87, -1, "|");
    b.at(95, 3, "o");
    b.gate(104);
  }),
  level("Cannon fort", "Cannons everywhere! Jump on cannonballs or burn them. The star makes you unstoppable for a while.", 116, 3, (b) => {
    b.ground(0, 115);
    b.at(2, 1, "S").row(5, 9, 1, "g");
    b.at(12, 4, "P");
    b.block(20, 21, 1, 2).at(21, 3, "C").at(16, 4, "o");
    b.block(30, 30, 1, 1).block(42, 42, 1, 1).at(34, 1, "b").at(38, 1, "b").at(36, 4, "o");
    b.block(46, 48, 1, 2).at(48, 3, "C");
    b.at(52, 1, "*");
    b.at(56, 4, "P");
    b.block(60, 60, 1, 1).block(78, 78, 1, 1).at(64, 1, "b").at(68, 1, "x").at(72, 1, "b").at(69, 4, "o");
    b.block(82, 84, 1, 2).at(84, 3, "C").block(86, 88, 1, 1);
    b.lava(91, 93);
    b.block(97, 97, 1, 1, "C").at(104, 1, "o");
    b.gate(110);
  }, { powers: ["F", "T"] }),
  level("Falling stones", "Stones drop from the ceiling. Keep moving!", 112, 3, (b) => {
    b.ground(0, 111);
    b.at(2, 1, "S");
    b.block(8, 40, 6, 7);
    for (let x = 11; x <= 37; x += 4) b.at(x, 5, "D");
    b.row(9, 39, 1, "g", 3).at(24, 1, "o");
    b.at(43, 1, "*");
    b.lava(46, 60);
    b.row(46, 60, 0, "c").at(53, 3, "o");
    b.at(64, 4, "P");
    b.block(68, 92, 6, 7).at(72, 5, "D").at(80, 5, "D").at(88, 5, "D").at(76, 1, "b").at(84, 1, "b").at(80, 1, "o");
    b.at(95, 1, "*");
    b.pit(98, 100).at(99, 3, "o");
    b.gate(106);
  }, { powers: ["U"] }),
  level("Wing climb", "Grab the wings and jump again in the air to reach the high rocks.", 110, 3, (b) => {
    b.ground(0, 10).lava(11, 99).ground(100, 109);
    b.at(2, 1, "S").at(7, 1, "W");
    b.pillar(14, 15, 3).pillar(19, 20, 5).at(19, 6, "o");
    b.pillar(25, 26, 4).at(29, 7, "y").at(29, 10, "|").at(29, 1, "|");
    b.pillar(32, 34, 6).at(33, 7, "*");
    b.block(38, 40, 8, 8).at(39, 9, "o");
    b.pillar(44, 45, 5).pillar(50, 51, 3);
    b.at(55, 2, "n").at(55, 9, "|").at(55, -1, "|");
    b.block(59, 62, 7, 7).at(60, 8, "o").at(62, 8, "W");
    b.pillar(66, 67, 4).pillar(72, 73, 2).pillar(78, 79, 4).at(75, 5, "y").at(75, 9, "|").at(75, -1, "|");
    b.pillar(84, 86, 3).at(85, 4, "o");
    b.at(90, 3, "m").at(88, 3, "|").at(99, 3, "|");
    b.gate(105);
  }),
  level("Last run", "Everything you've learned, all at once. Heart racing!", 136, 3, (b) => {
    b.ground(0, 135);
    b.at(2, 1, "S").at(6, 4, "P");
    b.block(10, 10, 1, 1).block(22, 22, 1, 1).at(14, 1, "b").at(18, 1, "x").at(16, 4, "o");
    b.block(26, 27, 1, 2).at(27, 3, "C");
    b.lava(30, 44);
    b.at(33, 2, "m").at(31, 2, "|").at(43, 2, "|").at(38, 5, "o");
    b.at(48, 1, "*");
    b.block(51, 70, 6, 7).at(55, 5, "D").at(61, 5, "D").at(67, 5, "D").at(60, 1, "o").row(52, 69, 1, "g", 3);
    b.at(73, 4, "P");
    b.block(76, 76, 1, 1, "R").block(79, 84, 5, 5).at(81, 6, "b").at(78, 6, "|").at(85, 6, "|").at(83, 6, "o");
    b.lava(88, 100).row(88, 100, 0, "c").at(94, 3, "o");
    b.at(104, 1, "*");
    b.block(108, 108, 1, 1).block(122, 122, 1, 1).at(112, 1, "b").at(116, 1, "x").at(119, 1, "b").at(115, 4, "o");
    b.block(125, 125, 1, 1, "C");
    b.gate(130);
  }, { powers: ["U", "F"] }),
  level("Boss: Volcano Queen", "The final boss! Her spikes come and go: only jump on her head when they're down. Seven hits!", 56, 3, (b) => {
    b.ground(0, 55);
    b.at(2, 1, "S").row(4, 6, 1, "g");
    b.at(7, 4, "P").at(10, 4, "P");
    arena(b, 14);
  }, { powers: ["U", "F"], boss: "Volcano Queen" }),
];

/* ───────── world state ───────── */

export type Enemy = {
  kind: "thorn" | "bug" | "bullet" | "stone" | "spit";
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alive: boolean;
  falling?: boolean;
  t: number;
};
export type Cannon = { x: number; y: number; t: number };
export type Platform = { x: number; y: number; w: number; h: number; vx: number; vy: number; dx: number; dy: number };
export type Fire = { x: number; y: number; vx: number; vy: number; t: number };
export type Boss = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  max: number;
  onGround: boolean;
  hurt: number;
  jumpT: number;
  shootT: number;
  spikeT: number;
  spikes: boolean;
  dead: boolean;
  level: 1 | 2 | 3;
};
export type ItemKind = "ring" | "crystal" | "life" | "pump" | "deflate" | "gem" | Power;
export type Item = { x: number; y: number; kind: ItemKind; taken: boolean; vy?: number; vx?: number; falling?: boolean; fromY?: number };
export type Crumble = { x: number; y: number; t: number; gone: number };

export type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  spin: number;
  face: 1 | -1;
  onGround: boolean;
  inWater: boolean;
  jumping: boolean;
  air: number;
  buffer: number;
  plat: number;
  shield: boolean;
  fire: boolean;
  wings: boolean;
  usedDouble: boolean;
  star: number;
  hurt: number;
  fireCool: number;
  mouth: number;
};

export type World = {
  def: LevelDef;
  w: number;
  tiles: string[][];
  ball: Ball;
  items: Item[];
  enemies: Enemy[];
  cannons: Cannon[];
  platforms: Platform[];
  crumbles: Map<number, Crumble>;
  fires: Fire[];
  boss: Boss | null;
  start: { x: number; y: number };
  checkpoint: { x: number; y: number };
  ringsLeft: number;
  powers: Power[];
  lives: number;
  gems: number;
  score: number;
  won: boolean;
  dead: number;
  gameOver: boolean;
  time: number;
  shake: number;
  rng: () => number;
};

export type Input = { left: boolean; right: boolean; jump: boolean; held?: boolean; fire?: boolean };
export type Event =
  | "jump"
  | "boing"
  | "ring"
  | "crystal"
  | "life"
  | "pump"
  | "deflate"
  | "die"
  | "win"
  | "gate"
  | "gem"
  | "bump"
  | "power"
  | "stomp"
  | "hurt"
  | "fire"
  | "burn"
  | "shoot"
  | "crumble"
  | "boss-hit"
  | "boss-dead"
  | "quake";

const BOSS_HP = [0, 3, 5, 7];

function freshBall(x: number, y: number): Ball {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    r: SMALL_R,
    spin: 0,
    face: 1,
    onGround: false,
    inWater: false,
    jumping: false,
    air: 1,
    buffer: 0,
    plat: -1,
    shield: false,
    fire: false,
    wings: false,
    usedDouble: false,
    star: 0,
    hurt: 0,
    fireCool: 0,
    mouth: 0,
  };
}

export type Carry = { shield?: boolean; fire?: boolean; wings?: boolean; gems?: number };

export function loadWorld(def: LevelDef, lives = 3, carry: Carry = {}, rng: () => number = Math.random): World {
  const w = Math.max(...def.rows.map((r) => r.length));
  const tiles = def.rows.map((r) => r.padEnd(w, " ").split(""));
  const items: Item[] = [];
  const enemies: Enemy[] = [];
  const cannons: Cannon[] = [];
  const platforms: Platform[] = [];
  const crumbles = new Map<number, Crumble>();
  let boss: Boss | null = null;
  let start = { x: 1.5, y: GY - SMALL_R * BOX };
  const itemKinds: Record<string, ItemKind> = { o: "ring", "*": "crystal", L: "life", "+": "pump", "-": "deflate", g: "gem", U: "U", F: "F", W: "W", T: "T" };
  for (let y = 0; y < tiles.length; y++)
    for (let x = 0; x < w; x++) {
      const ch = tiles[y]![x]!;
      if (itemKinds[ch]) {
        items.push({ x: x + 0.5, y: y + 0.5, kind: itemKinds[ch]!, taken: false });
        tiles[y]![x] = " ";
      } else if (ch === "x" || ch === "y") {
        enemies.push({ kind: "thorn", x: x + 0.5, y: y + 0.5, vx: ch === "x" ? 2 : 0, vy: ch === "y" ? 2.4 : 0, r: 0.36, alive: true, t: 0 });
        tiles[y]![x] = " ";
      } else if (ch === "b") {
        enemies.push({ kind: "bug", x: x + 0.5, y: y + 1 - 0.34, vx: -1.6, vy: 0, r: 0.34, alive: true, t: 0 });
        tiles[y]![x] = " ";
      } else if (ch === "D") {
        enemies.push({ kind: "stone", x: x + 0.5, y: y + 0.4, vx: 0, vy: 0, r: 0.32, alive: true, t: 0 });
        tiles[y]![x] = " ";
      } else if (ch === "C") {
        cannons.push({ x: x + 0.5, y: y + 0.5, t: 1 + (x % 3) * 0.6 });
      } else if (ch === "m" || ch === "n") {
        platforms.push({ x, y: y + 0.5, w: 3, h: 0.5, vx: ch === "m" ? 2 : 0, vy: ch === "n" ? 1.8 : 0, dx: 0, dy: 0 });
        tiles[y]![x] = " ";
      } else if (ch === "c") {
        crumbles.set(y * w + x, { x, y, t: -1, gone: 0 });
      } else if (ch === "B") {
        const lvl = def.world;
        boss = {
          name: def.boss ?? "Boss",
          x: x + 0.5,
          y: y + 1 - 0.95,
          w: 1.9,
          h: 1.9,
          vx: 0,
          vy: 0,
          hp: BOSS_HP[lvl]!,
          max: BOSS_HP[lvl]!,
          onGround: false,
          hurt: 0,
          jumpT: 2.5,
          shootT: 2,
          spikeT: 3,
          spikes: false,
          dead: false,
          level: lvl,
        };
        tiles[y]![x] = " ";
      } else if (ch === "S") {
        start = { x: x + 0.5, y: y + 1 - SMALL_R * BOX };
        tiles[y]![x] = " ";
      }
    }
  const ball = freshBall(start.x, start.y);
  ball.shield = !!carry.shield;
  ball.fire = !!carry.fire;
  ball.wings = !!carry.wings;
  return {
    def,
    w,
    tiles,
    ball,
    items,
    enemies,
    cannons,
    platforms,
    crumbles,
    fires: [],
    boss,
    start,
    checkpoint: { ...start },
    ringsLeft: items.filter((i) => i.kind === "ring").length,
    powers: [...(def.powers ?? [])],
    lives,
    gems: carry.gems ?? 0,
    score: 0,
    won: false,
    dead: 0,
    gameOver: false,
    time: 0,
    shake: 0,
    rng,
  };
}

export function tileAt(w: World, x: number, y: number) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || tx >= w.w) return "#";
  if (ty < 0 || ty >= H) return " ";
  return w.tiles[ty]![tx]!;
}

export function crumbleAt(w: World, tx: number, ty: number) {
  return w.crumbles.get(ty * w.w + tx);
}

export function gateOpen(w: World) {
  return w.ringsLeft <= 0 && (!w.boss || w.boss.dead);
}

function solidTile(w: World, ch: string, tx: number, ty: number) {
  if (ch === "#" || ch === "R" || ch === "k" || ch === "?" || ch === "P" || ch === "C") return true;
  if (ch === "c") return !(crumbleAt(w, tx, ty)?.gone ?? 0);
  if (ch === "E") return !gateOpen(w);
  return false;
}

function solidAt(w: World, x: number, y: number) {
  return solidTile(w, tileAt(w, x, y), Math.floor(x), Math.floor(y));
}

/** Solid for enemies too: they also stop at the invisible walls. */
function blocksEnemy(w: World, x: number, y: number) {
  return tileAt(w, x, y) === "|" || solidAt(w, x, y);
}

/* ───────── the ball's collisions ───────── */

type Box = { x0: number; y0: number; x1: number; y1: number; tile?: { ch: string; tx: number; ty: number }; plat?: number };

function solidsNear(w: World, x0: number, y0: number, x1: number, y1: number): Box[] {
  const out: Box[] = [];
  for (let ty = Math.floor(y0); ty <= Math.floor(y1 - 1e-6); ty++)
    for (let tx = Math.floor(x0); tx <= Math.floor(x1 - 1e-6); tx++) {
      const ch = tileAt(w, tx, ty);
      if (solidTile(w, ch, tx, ty)) out.push({ x0: tx, y0: ty, x1: tx + 1, y1: ty + 1, tile: { ch, tx, ty } });
    }
  w.platforms.forEach((p, i) => {
    if (p.x < x1 && p.x + p.w > x0 && p.y < y1 && p.y + p.h > y0) out.push({ x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h, plat: i });
  });
  return out;
}

function moveAxis(w: World, axis: "x" | "y", amount: number, events: Event[]) {
  const b = w.ball;
  const half = b.r * BOX;
  if (axis === "x") b.x += amount;
  else b.y += amount;
  const hits = solidsNear(w, b.x - half, b.y - half, b.x + half, b.y + half);
  if (!hits.length) return;
  let bumped = false;
  for (const s of hits) {
    if (axis === "x") {
      if (amount > 0) b.x = Math.min(b.x, s.x0 - half);
      else if (amount < 0) b.x = Math.max(b.x, s.x1 + half);
      b.vx = 0;
      continue;
    }
    if (amount > 0) {
      b.y = Math.min(b.y, s.y0 - half);
      if (s.tile?.ch === "R") {
        b.vy = -RUBBER_V;
        b.jumping = false;
        events.push("boing");
        return;
      }
      if (b.vy > 8) {
        b.vy = -b.vy * 0.25;
        events.push("boing");
      } else b.vy = 0;
      b.onGround = true;
      b.usedDouble = false;
      if (s.plat !== undefined) b.plat = s.plat;
      if (s.tile?.ch === "c") {
        const c = crumbleAt(w, s.tile.tx, s.tile.ty);
        if (c && c.t < 0 && !c.gone) {
          c.t = 0.45;
          events.push("crumble");
        }
      }
    } else if (amount < 0) {
      b.y = Math.max(b.y, s.y1 + half);
      b.vy = Math.max(0, b.vy);
      b.jumping = false;
      // bump only the block straight above the ball's middle
      if (!bumped && s.tile && (s.tile.ch === "?" || s.tile.ch === "P") && Math.floor(b.x) === s.tile.tx) {
        bumped = true;
        bump(w, s.tile.tx, s.tile.ty, s.tile.ch, events);
      }
    }
  }
  if (axis === "y" && amount < 0 && !bumped) {
    // nudge: if the middle missed, bump the nearest ? block we touched
    const s = hits.find((h) => h.tile && (h.tile.ch === "?" || h.tile.ch === "P"));
    if (s?.tile) bump(w, s.tile.tx, s.tile.ty, s.tile.ch, events);
  }
}

function bump(w: World, tx: number, ty: number, ch: string, events: Event[]) {
  w.tiles[ty]![tx] = "k";
  events.push("bump");
  if (ch === "?") {
    addGem(w, events);
    w.items.push({ x: tx + 0.5, y: ty - 0.5, kind: "gem", taken: true, vy: -6 });
  } else {
    // the power-up pops out, slides off the block towards the ball, and drops to the ground
    const kind = w.powers.shift() ?? "U";
    const dir = w.ball.x < tx + 0.5 ? -1 : 1;
    w.items.push({ x: tx + 0.5, y: ty - 0.5, kind, taken: false, falling: true, vy: -4, vx: dir * 2, fromY: ty - 0.5 });
  }
}

function addGem(w: World, events: Event[]) {
  w.gems += 1;
  w.score += 100;
  events.push("gem");
  if (w.gems % 50 === 0) {
    w.lives += 1;
    events.push("life");
  }
}

function respawn(w: World) {
  Object.assign(w.ball, freshBall(w.checkpoint.x, w.checkpoint.y));
  // an angry boss calms down when you come back
  if (w.boss && !w.boss.dead) {
    w.boss.jumpT = 2.5;
    w.boss.shootT = 2.5;
  }
  w.enemies = w.enemies.filter((e) => e.kind !== "spit" && e.kind !== "bullet");
}

function die(w: World, events: Event[]) {
  if (w.dead || w.won) return;
  w.lives -= 1;
  w.dead = 1;
  w.shake = 0.3;
  w.fires = [];
  events.push("die");
  if (w.lives <= 0) w.gameOver = true;
}

/** Something hit the ball: it loses a power-up first (and wobbles for a moment); with none left it pops. */
export function hurt(w: World, events: Event[]) {
  const b = w.ball;
  if (w.dead || w.won || b.star > 0 || b.hurt > 0) return;
  if (b.fire || b.shield || b.wings) {
    if (b.fire) b.fire = false;
    else if (b.shield) b.shield = false;
    else b.wings = false;
    b.hurt = HURT_TIME;
    w.shake = 0.2;
    events.push("hurt");
    return;
  }
  die(w, events);
}

/** Can the ball grow here? (a big ball must not end up inside a wall) */
function roomFor(w: World, r: number) {
  const b = w.ball;
  const half = r * BOX;
  const cy = Math.min(b.y, Math.floor(b.y + b.r * BOX) - half);
  return solidsNear(w, b.x - half, cy - half, b.x + half, cy + half).length ? null : cy;
}

function overlapBall(w: World, x: number, y: number, r: number) {
  const b = w.ball;
  return Math.hypot(x - b.x, y - b.y) < b.r + r;
}

/* ───────── everything else that moves ───────── */

function updatePlatforms(w: World, dt: number) {
  for (const p of w.platforms) {
    let nx = p.x + p.vx * dt;
    let ny = p.y + p.vy * dt;
    if (p.vx) {
      const edge = p.vx > 0 ? nx + p.w + 0.01 : nx - 0.01;
      if (blocksEnemy(w, edge, p.y + 0.2)) {
        p.vx = -p.vx;
        nx = p.x;
      }
    }
    if (p.vy) {
      const edge = p.vy > 0 ? ny + p.h + 0.01 : ny - 0.01;
      let blocked = edge < -1 || edge > H + 0.5;
      for (let x = p.x + 0.2; x < p.x + p.w; x += 1) if (blocksEnemy(w, x, edge)) blocked = true;
      if (blocked) {
        p.vy = -p.vy;
        ny = p.y;
      }
    }
    p.dx = nx - p.x;
    p.dy = ny - p.y;
    p.x = nx;
    p.y = ny;
  }
}

function updateCrumbles(w: World, dt: number, events: Event[]) {
  const b = w.ball;
  for (const c of w.crumbles.values()) {
    if (c.t >= 0 && !c.gone) {
      c.t -= dt;
      if (c.t < 0) {
        c.gone = 4;
        events.push("crumble");
      }
    } else if (c.gone) {
      c.gone = Math.max(0, c.gone - dt);
      if (!c.gone && Math.abs(b.x - (c.x + 0.5)) < 0.5 + b.r && Math.abs(b.y - (c.y + 0.5)) < 0.5 + b.r) c.gone = 0.3;
      if (!c.gone) c.t = -1;
    }
  }
}

function updateEnemies(w: World, dt: number, events: Event[]) {
  const b = w.ball;
  for (const e of w.enemies) {
    if (!e.alive) continue;
    e.t += dt;
    if (e.kind === "thorn") {
      const nx = e.x + e.vx * dt;
      const ny = e.y + e.vy * dt;
      const blocked = blocksEnemy(w, nx + Math.sign(e.vx) * 0.45, ny + Math.sign(e.vy) * 0.45);
      if (blocked || (e.vy && (ny < -0.5 || ny > H + 0.5))) {
        e.vx = -e.vx;
        e.vy = -e.vy;
      } else {
        e.x = nx;
        e.y = ny;
      }
    } else if (e.kind === "bug") {
      e.vy = Math.min(e.vy + G * dt, 15);
      const nx = e.x + e.vx * dt;
      const front = nx + Math.sign(e.vx) * e.r;
      const wall = blocksEnemy(w, front, e.y);
      const ledge = !blocksEnemy(w, front, e.y + e.r + 0.3) && blocksEnemy(w, e.x, e.y + e.r + 0.3);
      if (wall || ledge) e.vx = -e.vx;
      else e.x = nx;
      const ny = e.y + e.vy * dt;
      if (blocksEnemy(w, e.x, ny + e.r) && tileAt(w, e.x, ny + e.r) !== "|") {
        e.y = Math.floor(ny + e.r) - e.r;
        e.vy = 0;
      } else e.y = ny;
      if (e.y > H + 1) e.alive = false;
    } else if (e.kind === "stone") {
      if (!e.falling && Math.abs(b.x - e.x) < 1.7 && b.y > e.y && !w.dead) {
        e.falling = true;
        events.push("quake");
      }
      if (e.falling) {
        e.vy = Math.min(e.vy + G * dt, 18);
        e.y += e.vy * dt;
        if (solidAt(w, e.x, e.y + e.r) || tileAt(w, e.x, e.y + e.r) === "=" || e.y > H + 1) {
          e.alive = false;
          events.push("crumble");
        }
      }
    } else if (e.kind === "bullet") {
      e.x += e.vx * dt;
      if (solidAt(w, e.x + Math.sign(e.vx) * e.r, e.y) || e.t > 9) e.alive = false;
    } else if (e.kind === "spit") {
      e.vy = Math.min(e.vy + G * dt, 15);
      e.x += e.vx * dt;
      const ny = e.y + e.vy * dt;
      if (solidAt(w, e.x, ny + e.r)) {
        e.y = Math.floor(ny + e.r) - e.r;
        e.vy = 0;
      } else e.y = ny;
      if (solidAt(w, e.x + Math.sign(e.vx) * e.r, e.y) || e.t > 6 || e.y > H + 1) e.alive = false;
    }
  }
  for (const c of w.cannons) {
    c.t -= dt;
    const dist = Math.abs(b.x - c.x);
    if (c.t <= 0 && dist < 13 && dist > 1.2 && !w.dead) {
      const dir = b.x < c.x ? -1 : 1;
      w.enemies.push({ kind: "bullet", x: c.x + dir * 0.75, y: c.y, vx: dir * 4.6, vy: 0, r: 0.3, alive: true, t: 0 });
      c.t = 2.8;
      events.push("shoot");
    }
  }
  w.enemies = w.enemies.filter((e) => e.alive || e.kind === "stone" || e.kind === "bug" || e.kind === "thorn");
}

function updateBoss(w: World, dt: number, events: Event[]) {
  const k = w.boss;
  if (!k || k.dead) return;
  const b = w.ball;
  k.hurt = Math.max(0, k.hurt - dt);
  const dir = b.x < k.x ? -1 : 1;
  const speed = 1.5 + 0.45 * k.level + (k.max - k.hp) * 0.2;
  if (k.onGround) k.vx = w.dead ? 0 : dir * speed;
  k.vy = Math.min(k.vy + G * dt, 18);
  const nx = k.x + k.vx * dt;
  const side = nx + Math.sign(k.vx) * (k.w / 2);
  if (blocksEnemy(w, side, k.y + k.h / 2 - 0.1) || blocksEnemy(w, side, k.y - k.h / 2 + 0.1)) k.vx = 0;
  else k.x = nx;
  const ny = k.y + k.vy * dt;
  const wasAir = !k.onGround;
  k.onGround = false;
  if (k.vy > 0 && (solidAt(w, k.x - k.w / 3, ny + k.h / 2) || solidAt(w, k.x + k.w / 3, ny + k.h / 2))) {
    k.y = Math.floor(ny + k.h / 2) - k.h / 2;
    k.vy = 0;
    k.onGround = true;
    if (wasAir) {
      w.shake = 0.25;
      events.push("quake");
    }
  } else if (k.vy < 0 && (solidAt(w, k.x - k.w / 3, ny - k.h / 2) || solidAt(w, k.x + k.w / 3, ny - k.h / 2))) {
    k.vy = 0;
  } else k.y = ny;
  if (w.dead) return;
  k.jumpT -= dt;
  if (k.jumpT <= 0 && k.onGround) {
    k.vy = -12;
    k.onGround = false;
    k.jumpT = 3.4 - 0.4 * k.level + w.rng() * 0.8;
  }
  if (k.level >= 2) {
    k.shootT -= dt;
    if (k.shootT <= 0 && k.onGround) {
      w.enemies.push({ kind: "spit", x: k.x + dir * (k.w / 2 + 0.35), y: k.y + 0.4, vx: dir * 4.2, vy: -2, r: 0.32, alive: true, t: 0 });
      k.shootT = 2.8 - 0.3 * (k.level - 2);
      events.push("shoot");
    }
  }
  if (k.level >= 3) {
    k.spikeT -= dt;
    if (k.spikeT <= 0) {
      k.spikes = !k.spikes;
      k.spikeT = k.spikes ? 1.8 : 3.2;
    }
  }
}

function hitBoss(w: World, events: Event[]) {
  const k = w.boss!;
  k.hp -= 1;
  k.hurt = 1.1;
  k.spikes = false;
  k.spikeT = 2.5;
  w.score += 1000;
  w.shake = 0.25;
  events.push("boss-hit");
  if (k.hp <= 0) {
    k.dead = true;
    w.score += 5000;
    w.enemies = w.enemies.filter((e) => e.kind !== "spit");
    events.push("boss-dead", "gate");
  }
}

function updateFires(w: World, dt: number, events: Event[]) {
  for (const f of w.fires) {
    f.t += dt;
    f.vy = Math.min(f.vy + G * 0.9 * dt, 14);
    f.x += f.vx * dt;
    const ny = f.y + f.vy * dt;
    if (solidAt(w, f.x, ny + 0.18)) {
      f.y = Math.floor(ny + 0.18) - 0.18;
      f.vy = -7;
    } else f.y = ny;
    if (solidAt(w, f.x + Math.sign(f.vx) * 0.18, f.y) || tileAt(w, f.x, f.y) === "~" || f.y > H) f.t = 99;
    for (const e of w.enemies) {
      if (!e.alive || Math.hypot(e.x - f.x, e.y - f.y) > e.r + 0.25) continue;
      e.alive = false;
      f.t = 99;
      w.score += 200;
      events.push("burn");
    }
    const k = w.boss;
    if (k && !k.dead && f.t < 99 && Math.abs(f.x - k.x) < k.w / 2 + 0.2 && Math.abs(f.y - k.y) < k.h / 2 + 0.2) {
      f.t = 99;
      if (k.hurt <= 0.4) hitBoss(w, events);
    }
  }
  w.fires = w.fires.filter((f) => f.t < 1.6);
}

/* ───────── one step of the game ───────── */

export function step(w: World, input: Input, dt: number): Event[] {
  const events: Event[] = [];
  if (w.won || w.gameOver) return events;
  w.time += dt;
  w.shake = Math.max(0, w.shake - dt);
  updatePlatforms(w, dt);
  updateCrumbles(w, dt, events);
  updateEnemies(w, dt, events);
  updateBoss(w, dt, events);
  updateFires(w, dt, events);
  if (w.dead) {
    w.dead = Math.max(0, w.dead - dt);
    if (!w.dead && !w.gameOver) respawn(w);
    return events;
  }
  const b = w.ball;
  if (b.plat >= 0) {
    const p = w.platforms[b.plat];
    if (p) {
      b.x += p.dx;
      b.y += p.dy;
    }
  }
  b.plat = -1;
  b.hurt = Math.max(0, b.hurt - dt);
  b.star = Math.max(0, b.star - dt);
  b.fireCool = Math.max(0, b.fireCool - dt);
  b.mouth = Math.max(0, b.mouth - dt);
  const big = b.r > SMALL_R + 0.01;
  b.inWater = tileAt(w, b.x, b.y) === "~";
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir) b.face = dir > 0 ? 1 : -1;
  const maxV = b.inWater ? MAX_V_WATER : MAX_V;
  const acc = b.onGround ? ACC_GROUND : ACC_AIR;
  if (dir) b.vx += dir * acc * dt;
  else {
    const drag = (b.onGround ? 18 : 3) * dt;
    b.vx = Math.abs(b.vx) <= drag ? 0 : b.vx - Math.sign(b.vx) * drag;
  }
  b.vx = Math.max(-maxV, Math.min(maxV, b.vx));

  // jumping: from the ground (or a moment after rolling off it), from water, or a wings double jump
  b.air = b.onGround ? 0 : b.air + dt;
  if (input.jump) b.buffer = BUFFER;
  else b.buffer = Math.max(0, b.buffer - dt);
  const surface = b.inWater && tileAt(w, b.x, b.y - b.r) !== "~";
  if (b.buffer > 0) {
    if (b.onGround || (b.air < COYOTE && !b.jumping && b.vy >= 0)) {
      b.vy = -JUMP_V;
      b.jumping = true;
      b.buffer = 0;
      b.onGround = false;
      b.air = COYOTE;
      events.push("jump");
    } else if (b.inWater && (big ? surface : true)) {
      b.vy = big ? -10 : -6;
      b.buffer = 0;
      events.push("jump");
    } else if (input.jump && b.wings && !b.usedDouble) {
      b.vy = -JUMP_V * 0.85;
      b.jumping = true;
      b.usedDouble = true;
      b.buffer = 0;
      events.push("jump");
    }
  }
  if (b.vy >= 0) b.jumping = false;
  if (!input.held && b.jumping && b.vy < -5) {
    b.vy = -5;
    b.jumping = false;
  }
  if (input.fire && b.fire && b.fireCool <= 0 && w.fires.length < 3) {
    w.fires.push({ x: b.x + b.face * b.r, y: b.y, vx: b.face * 11 + b.vx * 0.3, vy: 2, t: 0 });
    b.fireCool = FIRE_GAP;
    b.mouth = 0.25;
    events.push("fire");
  }
  if (b.inWater) {
    b.vy += (big ? -14 : 7) * dt;
    b.vy *= 1 - Math.min(1, 3 * dt);
  } else b.vy += G * dt;
  b.vy = Math.min(b.vy, 20);
  const steps = Math.max(1, Math.ceil((Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt) / 0.2));
  const wasGround = b.onGround;
  b.onGround = false;
  for (let i = 0; i < steps; i++) {
    moveAxis(w, "x", (b.vx * dt) / steps, events);
    moveAxis(w, "y", (b.vy * dt) / steps, events);
  }
  if (!b.onGround && wasGround && b.vy >= 0) {
    const half = b.r * BOX;
    const under = solidsNear(w, b.x - half, b.y + half, b.x + half, b.y + half + 0.04);
    if (under.length && !under.some((s) => s.tile?.ch === "R")) {
      b.onGround = true;
      const p = under.find((s) => s.plat !== undefined);
      if (p) b.plat = p.plat!;
    }
  }
  b.spin += (b.vx * dt) / b.r;

  // spikes and lava
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
    const ch = tileAt(w, px, py);
    if (ch === "^" && py - Math.floor(py) > 0.35) hurt(w, events);
    if (ch === "v" && py - Math.floor(py) < 0.65) hurt(w, events);
    if (ch === "=" && py - Math.floor(py) > 0.2) die(w, events);
  }
  if (b.y > H + 1) die(w, events);
  if (w.dead) return events;

  // enemies: jump on bugs and cannonballs; everything else hurts
  for (const e of w.enemies) {
    if (!e.alive || !overlapBall(w, e.x, e.y, e.r)) continue;
    if (b.star > 0) {
      e.alive = false;
      w.score += 200;
      events.push("stomp");
      continue;
    }
    const fromAbove = b.vy > 0 && b.y < e.y - e.r * 0.3;
    if ((e.kind === "bug" || e.kind === "bullet") && fromAbove) {
      e.alive = false;
      b.vy = input.held ? -STOMP_V * 1.3 : -STOMP_V;
      b.jumping = false;
      w.score += 200;
      events.push("stomp");
    } else hurt(w, events);
  }
  // the boss: bounce on its head, don't touch the rest
  const k = w.boss;
  if (k && !k.dead && !w.dead) {
    const half = b.r * BOX;
    const touching = b.x + half > k.x - k.w / 2 && b.x - half < k.x + k.w / 2 && b.y + half > k.y - k.h / 2 && b.y - half < k.y + k.h / 2;
    if (touching) {
      const onHead = b.vy > 0 && b.y < k.y - k.h * 0.2;
      if (onHead && !k.spikes && k.hurt <= 0) {
        b.vy = -15;
        b.jumping = false;
        hitBoss(w, events);
      } else if (onHead && k.hurt > 0 && !k.spikes) {
        b.vy = -10;
      } else if (b.star > 0) {
        if (k.hurt <= 0) hitBoss(w, events);
      } else if (k.hurt <= 0.6) {
        hurt(w, events);
        b.vx = (b.x < k.x ? -1 : 1) * 7;
        b.vy = -8;
      }
    }
  }
  if (w.dead) return events;

  // items
  for (const it of w.items) {
    if (it.falling) {
      if (it.vx) {
        const nx = it.x + it.vx * dt;
        if (solidAt(w, nx + Math.sign(it.vx) * 0.4, it.y)) it.vx = -it.vx;
        else it.x = nx;
      }
      it.vy = Math.min((it.vy ?? 0) + G * 0.6 * dt, 10);
      const ny = it.y + it.vy * dt;
      if (it.vy > 0 && solidAt(w, it.x, ny + 0.45)) {
        it.y = Math.floor(ny + 0.45) - 0.45;
        it.vy = 0;
        // stop once it has dropped off the block it came out of
        if (it.y > (it.fromY ?? it.y) + 0.5 || !it.vx) it.falling = false;
      } else it.y = ny;
      if (it.y > H + 1) it.taken = true;
    } else if (it.taken && it.kind === "gem" && it.vy !== undefined && it.vy < 6) {
      it.y += it.vy * dt;
      it.vy += 20 * dt;
    }
    if (it.taken) continue;
    const d = Math.hypot(it.x - b.x, it.y - b.y);
    const reach = it.kind === "ring" ? 0.75 + b.r : 0.45 + b.r;
    if (d > reach) continue;
    if (it.kind === "ring") {
      it.taken = true;
      w.ringsLeft -= 1;
      w.score += 500;
      events.push("ring");
      if (gateOpen(w)) events.push("gate");
    } else if (it.kind === "gem") {
      it.taken = true;
      addGem(w, events);
    } else if (it.kind === "crystal") {
      it.taken = true;
      w.checkpoint = { x: it.x, y: Math.floor(it.y) + 1 - SMALL_R * BOX };
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
    } else if (it.kind === "U" || it.kind === "F" || it.kind === "W" || it.kind === "T") {
      it.taken = true;
      if (it.kind === "U") b.shield = true;
      if (it.kind === "F") b.fire = true;
      if (it.kind === "W") b.wings = true;
      if (it.kind === "T") b.star = STAR_TIME;
      w.score += 300;
      events.push("power");
    }
  }
  if (gateOpen(w)) {
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
