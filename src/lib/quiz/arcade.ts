/**
 * Difficulty levels for the side games (Word Snake, Memory Match).
 * Every level also gets harder as the game goes on: longer words, a faster snake,
 * more trick letters, more cards, less time.
 */

export type ArcadeLevel = "easy" | "medium" | "hard" | "expert";

export const ARCADE_LEVELS: ArcadeLevel[] = ["easy", "medium", "hard", "expert"];

export const LEVEL_NAMES: Record<ArcadeLevel, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

export function defaultLevel(age: "young" | "old"): ArcadeLevel {
  return age === "young" ? "easy" : "medium";
}

/* ---------- Word Snake ---------- */

export type SnakeLevel = {
  /** Shown under the level button. */
  blurb: string;
  /** Word ladder tier the game starts on (0 = 3-letter words). */
  startTier: number;
  /** Words to finish before the words get longer. */
  wordsPerTier: number;
  baseMs: number;
  msPerWord: number;
  minMs: number;
  baseDecoys: number;
  maxDecoys: number;
  /** "always": the word stays on screen. "flash": it shows, then hides and must be remembered. */
  word: "always" | "flash";
  /** Glow on the next letter to eat. */
  highlightNext: boolean;
  /** How long the word shows before hiding (flash levels), shrinking as you go. */
  flashMs: number;
  minFlashMs: number;
  /** Let the player hear the word again (a spelling-bee style hint). */
  canHear: boolean;
  /** Show the picture clue. */
  showPicture: boolean;
};

export const SNAKE_LEVELS: Record<ArcadeLevel, SnakeLevel> = {
  easy: {
    blurb: "Word stays on screen, next letter glows",
    startTier: 0,
    wordsPerTier: 3,
    baseMs: 320,
    msPerWord: 8,
    minMs: 170,
    baseDecoys: 3,
    maxDecoys: 6,
    word: "always",
    highlightNext: true,
    flashMs: 0,
    minFlashMs: 0,
    canHear: true,
    showPicture: true,
  },
  medium: {
    blurb: "Word stays on screen, faster, more trick letters",
    startTier: 1,
    wordsPerTier: 3,
    baseMs: 250,
    msPerWord: 10,
    minMs: 140,
    baseDecoys: 4,
    maxDecoys: 9,
    word: "always",
    highlightNext: false,
    flashMs: 0,
    minFlashMs: 0,
    canHear: true,
    showPicture: true,
  },
  hard: {
    blurb: "See the word, then spell it from memory",
    startTier: 1,
    wordsPerTier: 3,
    baseMs: 235,
    msPerWord: 10,
    minMs: 130,
    baseDecoys: 5,
    maxDecoys: 10,
    word: "flash",
    highlightNext: false,
    flashMs: 4000,
    minFlashMs: 2000,
    canHear: true,
    showPicture: true,
  },
  expert: {
    blurb: "Quick look only, long words, fastest snake",
    startTier: 2,
    wordsPerTier: 2,
    baseMs: 200,
    msPerWord: 12,
    minMs: 110,
    baseDecoys: 6,
    maxDecoys: 12,
    word: "flash",
    highlightNext: false,
    flashMs: 2500,
    minFlashMs: 1200,
    canHear: false,
    showPicture: false,
  },
};

/* ---------- Memory Match ---------- */

export type MemoryLevel = {
  blurb: string;
  startPairs: number;
  pairsPerRound: number;
  maxPairs: number;
  /** All cards are shown face up for this long at the start of each round (0 = no peek). */
  peekMs: number;
  /** How long two unmatched cards stay face up. */
  flipBackMs: number;
  /** Seconds per pair for the round timer (0 = no timer). */
  secondsPerPair: number;
};

export const MEMORY_LEVELS: Record<ArcadeLevel, MemoryLevel> = {
  easy: { blurb: "A quick peek first, no timer", startPairs: 4, pairsPerRound: 1, maxPairs: 8, peekMs: 2500, flipBackMs: 1100, secondsPerPair: 0 },
  medium: { blurb: "A short peek, more cards each round", startPairs: 6, pairsPerRound: 1, maxPairs: 10, peekMs: 1200, flipBackMs: 850, secondsPerPair: 0 },
  hard: { blurb: "No peek and a timer", startPairs: 8, pairsPerRound: 2, maxPairs: 12, peekMs: 0, flipBackMs: 650, secondsPerPair: 8 },
  expert: { blurb: "Lots of cards, quick flips, tight timer", startPairs: 10, pairsPerRound: 2, maxPairs: 15, peekMs: 0, flipBackMs: 500, secondsPerPair: 5 },
};

/** Pairs for a round (round 1 is the first), growing until the level's cap. */
export function pairsForRound(level: MemoryLevel, round: number) {
  return Math.min(level.maxPairs, level.startPairs + Math.max(0, round - 1) * level.pairsPerRound);
}

/** The timer shrinks a little each round on timed levels. */
export function secondsForRound(level: MemoryLevel, round: number, pairs: number) {
  if (!level.secondsPerPair) return 0;
  const perPair = Math.max(level.secondsPerPair - 0.5 * Math.max(0, round - 1), level.secondsPerPair / 2);
  return Math.round(pairs * perPair);
}

/* ---------- remembering the chosen level ---------- */

const LEVEL_KEY = (game: string) => `quizy-level-${game}`;

export function loadLevel(game: string, age: "young" | "old"): ArcadeLevel {
  try {
    const saved = localStorage.getItem(LEVEL_KEY(game));
    if (saved && (ARCADE_LEVELS as string[]).includes(saved)) return saved as ArcadeLevel;
  } catch {
    /* storage may be blocked */
  }
  return defaultLevel(age);
}

export function saveLevel(game: string, level: ArcadeLevel) {
  try {
    localStorage.setItem(LEVEL_KEY(game), level);
  } catch {
    /* ignore */
  }
}
