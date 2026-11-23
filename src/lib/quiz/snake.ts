/**
 * Word Snake — pure game rules (no React, no canvas), so they can be tested.
 *
 * A word is shown. Its letters, plus a few decoy letters, are scattered on a
 * grid. The player steers the snake to eat the word's letters IN ORDER.
 * Eating a decoy, a letter out of order, or bumping into itself costs a life.
 * The board wraps at the edges, so young players never crash into a wall.
 */

export type Dir = "up" | "down" | "left" | "right";
export type Cell = { x: number; y: number };
export type Tile = Cell & { letter: string; id: number };

export type SnakeWord = { word: string; emoji: string; hint: string };

export const GRID = 13;

/** Word ladder, easiest first. Each tier is a little longer. */
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
    { word: "GIRAFFE", emoji: "🦒", hint: "The tallest animal." },
    { word: "DOLPHIN", emoji: "🐬", hint: "A clever sea mammal." },
    { word: "PENGUIN", emoji: "🐧", hint: "A bird that cannot fly." },
    { word: "RAINBOW", emoji: "🌈", hint: "Seven colours in the sky." },
  ],
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export function step(cell: Cell, dir: Dir, size = GRID): Cell {
  const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
  const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
  return { x: (cell.x + dx + size) % size, y: (cell.y + dy + size) % size };
}

export function same(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

/** A short snake in the middle-left of the board, heading right. */
export function spawnSnake(size = GRID): Cell[] {
  const y = Math.floor(size / 2);
  return [
    { x: 3, y },
    { x: 2, y },
    { x: 1, y },
  ];
}

/** Keep the lane in front of a fresh snake clear so it never spawns into a letter. */
function inSpawnLane(cell: Cell, size = GRID) {
  return cell.y === Math.floor(size / 2) && cell.x <= 6;
}

export function decoyCount(wordIndex: number) {
  return Math.min(3 + wordIndex, 9);
}

/** Scatter the word's letters and some decoys on free cells. */
export function layTiles(word: string, decoys: number, avoid: Cell[], rnd: () => number = Math.random, size = GRID): Tile[] {
  const used = new Set(avoid.map((c) => `${c.x},${c.y}`));
  const tiles: Tile[] = [];
  let id = 1;
  const freeCell = (): Cell => {
    for (let tries = 0; tries < 500; tries++) {
      const cell = { x: Math.floor(rnd() * size), y: Math.floor(rnd() * size) };
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

export function tickMs(age: "young" | "old", wordsDone: number) {
  const base = age === "young" ? 300 : 230;
  return Math.max(130, base - wordsDone * 10);
}

/** Young explorers start on 3-letter words, older ones on 4-letter words; every 3 words climbs a tier. */
export function wordFor(age: "young" | "old", wordsDone: number, rnd: () => number = Math.random): SnakeWord {
  const start = age === "young" ? 0 : 1;
  const tier = Math.min(SNAKE_WORDS.length - 1, start + Math.floor(wordsDone / 3));
  const list = SNAKE_WORDS[tier] ?? SNAKE_WORDS[0]!;
  return list[Math.floor(rnd() * list.length)] ?? list[0]!;
}
