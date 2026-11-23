/**
 * Word Snake — pure game rules (no React, no canvas), so they can be tested.
 *
 * A word is shown. Its letters, plus a few decoy letters, are scattered on a
 * grid. The player steers the snake to eat the word's letters IN ORDER.
 * Eating a decoy, a letter out of order, or bumping into itself costs a life.
 * The board wraps at the edges, so young players never crash into a wall.
 */

import { SNAKE_LEVELS, type SnakeLevel } from "./arcade.ts";

export type Dir = "up" | "down" | "left" | "right";
export type Cell = { x: number; y: number };
export type Tile = Cell & { letter: string; id: number };

export type SnakeWord = { word: string; emoji: string; hint: string };

export const GRID = 13;

/** Board size in cells. A plain number means a square board. */
export type Board = number | { cols: number; rows: number };
export function dims(board: Board = GRID) {
  return typeof board === "number" ? { cols: board, rows: board } : board;
}

/**
 * Fit a board to a screen area: the short side gets about 13 cells and the
 * long side as many cells of that size as fit, so the board fills the space.
 */
export function boardFor(width: number, height: number, short = GRID, maxLong = 24): { cols: number; rows: number } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const cell = Math.min(w, h) / short;
  const cols = Math.max(short, Math.min(maxLong, Math.floor(w / cell)));
  const rows = Math.max(short, Math.min(maxLong, Math.floor(h / cell)));
  return w >= h ? { cols, rows: short } : { cols: short, rows };
}

/**
 * Word ladder, easiest first: 3, 4, 5, 6, 7, 8 letters, then 9–10, 11–12 and 13–15 letters.
 * Each level starts on its own rung and climbs as words are spelled.
 */
export const SNAKE_WORDS: SnakeWord[][] = [
  [
    { word: "CAT", emoji: "🐱", hint: "It says meow." },
    { word: "DOG", emoji: "🐶", hint: "It wags its tail." },
    { word: "SUN", emoji: "☀️", hint: "It shines in the sky." },
    { word: "BUS", emoji: "🚌", hint: "It takes you to school." },
    { word: "BEE", emoji: "🐝", hint: "It makes honey." },
    { word: "FOX", emoji: "🦊", hint: "A clever orange animal." },
    { word: "PIG", emoji: "🐷", hint: "It says oink." },
    { word: "EGG", emoji: "🥚", hint: "A chick hatches from it." },
    { word: "HAT", emoji: "🎩", hint: "You wear it on your head." },
    { word: "CUP", emoji: "🥤", hint: "You drink from it." },
  ],
  [
    { word: "FISH", emoji: "🐟", hint: "It swims with fins." },
    { word: "FROG", emoji: "🐸", hint: "It hops and croaks." },
    { word: "BOOK", emoji: "📚", hint: "You read it." },
    { word: "TREE", emoji: "🌳", hint: "It has leaves and a trunk." },
    { word: "STAR", emoji: "⭐", hint: "It twinkles at night." },
    { word: "MOON", emoji: "🌙", hint: "It glows in the night sky." },
    { word: "LION", emoji: "🦁", hint: "King of the jungle." },
    { word: "CAKE", emoji: "🎂", hint: "A birthday treat." },
    { word: "DUCK", emoji: "🦆", hint: "It says quack." },
    { word: "KITE", emoji: "🪁", hint: "It flies on a windy day." },
  ],
  [
    { word: "APPLE", emoji: "🍎", hint: "A crunchy red fruit." },
    { word: "TIGER", emoji: "🐯", hint: "A big cat with stripes." },
    { word: "ZEBRA", emoji: "🦓", hint: "Black and white stripes." },
    { word: "HOUSE", emoji: "🏠", hint: "A family lives in it." },
    { word: "TRAIN", emoji: "🚆", hint: "It runs on tracks." },
    { word: "SNAKE", emoji: "🐍", hint: "Just like you!" },
    { word: "WATER", emoji: "💧", hint: "You drink it every day." },
    { word: "CLOUD", emoji: "☁️", hint: "Rain falls from it." },
    { word: "MANGO", emoji: "🥭", hint: "A sweet yellow fruit." },
    { word: "HORSE", emoji: "🐴", hint: "You can ride it." },
  ],
  [
    { word: "JUNGLE", emoji: "🌴", hint: "A thick, green forest." },
    { word: "PLANET", emoji: "🪐", hint: "Earth is one." },
    { word: "ROCKET", emoji: "🚀", hint: "It blasts into space." },
    { word: "BANANA", emoji: "🍌", hint: "A long yellow fruit." },
    { word: "RABBIT", emoji: "🐰", hint: "It has long ears." },
    { word: "TURTLE", emoji: "🐢", hint: "It carries its shell." },
    { word: "GARDEN", emoji: "🌻", hint: "Flowers grow here." },
    { word: "SCHOOL", emoji: "🏫", hint: "You learn here." },
    { word: "PENCIL", emoji: "✏️", hint: "You write with it." },
    { word: "MONKEY", emoji: "🐒", hint: "It swings in trees." },
    { word: "CASTLE", emoji: "🏰", hint: "A king lives here." },
    { word: "WINDOW", emoji: "🪟", hint: "You look out of it." },
  ],
  [
    { word: "DOLPHIN", emoji: "🐬", hint: "A clever sea animal." },
    { word: "PENGUIN", emoji: "🐧", hint: "A bird that cannot fly." },
    { word: "RAINBOW", emoji: "🌈", hint: "Colours after the rain." },
    { word: "GIRAFFE", emoji: "🦒", hint: "The tallest animal." },
    { word: "TEACHER", emoji: "👩‍🏫", hint: "Helps you learn." },
    { word: "CHICKEN", emoji: "🐔", hint: "It lays eggs." },
    { word: "KITCHEN", emoji: "🍳", hint: "Food is cooked here." },
    { word: "BLANKET", emoji: "🛏️", hint: "Keeps you warm in bed." },
    { word: "PYRAMID", emoji: "🔺", hint: "Built in ancient Egypt." },
    { word: "VOLCANO", emoji: "🌋", hint: "A mountain that erupts." },
    { word: "LANTERN", emoji: "🏮", hint: "A light you carry." },
    { word: "PUMPKIN", emoji: "🎃", hint: "A big orange vegetable." },
  ],
  [
    { word: "ELEPHANT", emoji: "🐘", hint: "It has a long trunk." },
    { word: "KANGAROO", emoji: "🦘", hint: "It hops and has a pouch." },
    { word: "DINOSAUR", emoji: "🦕", hint: "It lived long, long ago." },
    { word: "UMBRELLA", emoji: "☂️", hint: "It keeps the rain off you." },
    { word: "MOUNTAIN", emoji: "⛰️", hint: "Much bigger than a hill." },
    { word: "SANDWICH", emoji: "🥪", hint: "Bread with a filling." },
    { word: "SQUIRREL", emoji: "🐿️", hint: "It hides nuts." },
    { word: "HOSPITAL", emoji: "🏥", hint: "Doctors work here." },
    { word: "NOTEBOOK", emoji: "📓", hint: "You write in it." },
    { word: "AIRPLANE", emoji: "✈️", hint: "It flies people far away." },
    { word: "BIRTHDAY", emoji: "🎂", hint: "Your special day each year." },
    { word: "TOMORROW", emoji: "📅", hint: "The day after today." },
  ],
  [
    { word: "BUTTERFLY", emoji: "🦋", hint: "It was once a caterpillar." },
    { word: "CROCODILE", emoji: "🐊", hint: "Big teeth, lives in rivers." },
    { word: "SNOWFLAKE", emoji: "❄️", hint: "Frozen and falls from the sky." },
    { word: "CHOCOLATE", emoji: "🍫", hint: "A sweet brown treat." },
    { word: "ASTRONAUT", emoji: "👩‍🚀", hint: "Travels into space." },
    { word: "TELESCOPE", emoji: "🔭", hint: "Helps you see the stars." },
    { word: "PINEAPPLE", emoji: "🍍", hint: "A spiky tropical fruit." },
    { word: "WATERMELON", emoji: "🍉", hint: "Green outside, red inside." },
    { word: "STRAWBERRY", emoji: "🍓", hint: "A small red fruit with seeds." },
    { word: "HELICOPTER", emoji: "🚁", hint: "It flies with spinning blades." },
    { word: "BASKETBALL", emoji: "🏀", hint: "You bounce it and shoot it." },
    { word: "MICROSCOPE", emoji: "🔬", hint: "Makes tiny things look big." },
  ],
  [
    { word: "GRASSHOPPER", emoji: "🦗", hint: "A green insect that jumps." },
    { word: "CATERPILLAR", emoji: "🐛", hint: "It turns into a butterfly." },
    { word: "THUNDERSTORM", emoji: "⛈️", hint: "Lightning, thunder and rain." },
    { word: "PHOTOGRAPHER", emoji: "📸", hint: "Takes pictures for a job." },
    { word: "REFRIGERATOR", emoji: "🧊", hint: "Keeps food cold." },
    { word: "WHEELBARROW", emoji: "🛒", hint: "Push it to carry soil." },
    { word: "MATHEMATICS", emoji: "➗", hint: "Numbers, shapes and sums." },
    { word: "ENCYCLOPEDIA", emoji: "📚", hint: "A book of facts about everything." },
    { word: "HIPPOPOTAMUS", emoji: "🦛", hint: "A huge animal that loves water." },
    { word: "KALEIDOSCOPE", emoji: "🔮", hint: "A tube of changing colourful patterns." },
    { word: "ELECTRICITY", emoji: "⚡", hint: "It powers lights and machines." },
    { word: "CHAMPIONSHIP", emoji: "🏆", hint: "A contest to find the best." },
  ],
  [
    { word: "CONSTELLATION", emoji: "✨", hint: "A group of stars making a shape." },
    { word: "EXTRAORDINARY", emoji: "🤩", hint: "Very, very unusual." },
    { word: "PHOTOSYNTHESIS", emoji: "🌿", hint: "How plants make food from sunlight." },
    { word: "ARCHAEOLOGIST", emoji: "🏺", hint: "Digs up things from long ago." },
    { word: "RESPONSIBILITY", emoji: "🤝", hint: "A job you must take care of." },
    { word: "METAMORPHOSIS", emoji: "🦋", hint: "A big change, like caterpillar to butterfly." },
    { word: "TRANSPORTATION", emoji: "🚆", hint: "Ways of moving people and things." },
    { word: "CONGRATULATIONS", emoji: "🎉", hint: "What you say when someone wins." },
    { word: "UNDERSTANDING", emoji: "💡", hint: "Knowing what something means." },
    { word: "INVESTIGATION", emoji: "🔍", hint: "Looking carefully for the truth." },
    { word: "ENTERTAINMENT", emoji: "🎭", hint: "Shows and fun to enjoy." },
    { word: "EXPERIMENTING", emoji: "🧪", hint: "Trying things out to learn." },
  ],
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export function step(cell: Cell, dir: Dir, size: Board = GRID): Cell {
  const { cols, rows } = dims(size);
  const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
  const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
  return { x: (cell.x + dx + cols) % cols, y: (cell.y + dy + rows) % rows };
}

export function same(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

/** A short snake in the middle-left of the board, heading right. */
export function spawnSnake(size: Board = GRID): Cell[] {
  const y = Math.floor(dims(size).rows / 2);
  return [
    { x: 3, y },
    { x: 2, y },
    { x: 1, y },
  ];
}

/** Keep the lane in front of a fresh snake clear so it never spawns into a letter. */
function inSpawnLane(cell: Cell, size: Board = GRID) {
  return cell.y === Math.floor(dims(size).rows / 2) && cell.x <= 6;
}

export function decoyCount(wordIndex: number, level: SnakeLevel = SNAKE_LEVELS.easy) {
  return Math.min(level.baseDecoys + wordIndex, level.maxDecoys);
}

/** Scatter the word's letters and some decoys on free cells. */
export function layTiles(word: string, decoys: number, avoid: Cell[], rnd: () => number = Math.random, size: Board = GRID): Tile[] {
  const { cols, rows } = dims(size);
  const used = new Set(avoid.map((c) => `${c.x},${c.y}`));
  const tiles: Tile[] = [];
  let id = 1;
  const freeCell = (): Cell => {
    for (let tries = 0; tries < 500; tries++) {
      const cell = { x: Math.floor(rnd() * cols), y: Math.floor(rnd() * rows) };
      const key = `${cell.x},${cell.y}`;
      if (used.has(key) || inSpawnLane(cell, size)) continue;
      // keep letters from touching each other so a child can steer between them
      const crowded = tiles.some((t) => Math.abs(t.x - cell.x) + Math.abs(t.y - cell.y) < 2);
      if (crowded && tries < 400) continue;
      used.add(key);
      return cell;
    }
    throw new Error("board is full");
  };
  for (const letter of word) tiles.push({ ...freeCell(), letter, id: id++ });
  const pool = ALPHABET.split("").filter((l) => !word.includes(l));
  for (let i = 0; i < decoys; i++) {
    const letter = pool[Math.floor(rnd() * pool.length)] ?? "X";
    tiles.push({ ...freeCell(), letter, id: id++ });
  }
  return tiles;
}

export type Bite =
  | { kind: "none" }
  | { kind: "good"; tile: Tile; done: boolean }
  | { kind: "wrong"; tile: Tile; reason: "not-in-word" | "out-of-order"; needed: string }
  | { kind: "self" };

/** What happens when the head moves onto `head`? */
export function judge(head: Cell, body: Cell[], tiles: Tile[], word: string, progress: number): Bite {
  // the tail moves away on this step, so it is safe to move into it
  if (body.slice(0, -1).some((c) => same(c, head))) return { kind: "self" };
  const tile = tiles.find((t) => same(t, head));
  if (!tile) return { kind: "none" };
  const needed = word[progress] ?? "";
  if (tile.letter === needed) return { kind: "good", tile, done: progress + 1 >= word.length };
  return {
    kind: "wrong",
    tile,
    needed,
    reason: word.includes(tile.letter) ? "out-of-order" : "not-in-word",
  };
}

export function oopsMessage(bite: Bite, word: string) {
  if (bite.kind === "self") return "Ouch! The snake bumped into its own tail.";
  if (bite.kind !== "wrong") return "";
  return bite.reason === "not-in-word"
    ? `"${bite.tile.letter}" is not in ${word}. Look for "${bite.needed}".`
    : `"${bite.tile.letter}" is in ${word}, but "${bite.needed}" comes first.`;
}

export function tickMs(level: SnakeLevel, wordsDone: number) {
  return Math.max(level.minMs, level.baseMs - wordsDone * level.msPerWord);
}

/** How long the word shows before hiding on memory levels; shorter as the game goes on. */
export function flashMsFor(level: SnakeLevel, wordsDone: number, length = 0) {
  if (level.word !== "flash") return 0;
  // long words get a little longer to read: 0.3 s for each letter past five
  return Math.max(level.minFlashMs, level.flashMs - wordsDone * 250) + Math.max(0, length - 5) * 300;
}

/** Starts on the level's tier and climbs to longer words as words are finished. */
export function wordFor(level: SnakeLevel, wordsDone: number, rnd: () => number = Math.random, avoid = ""): SnakeWord {
  const top = Math.min(SNAKE_WORDS.length - 1, level.maxTier);
  const tier = Math.min(top, level.startTier + Math.floor(wordsDone / level.wordsPerTier));
  const list = (SNAKE_WORDS[tier] ?? SNAKE_WORDS[0]!).filter((w) => w.word !== avoid);
  return list[Math.floor(rnd() * list.length)] ?? list[0]!;
}
