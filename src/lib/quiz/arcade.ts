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
  /** Highest rung of the word ladder (0 = 3 letters … 8 = 13–15 letters). */
  maxTier: number;
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
    maxTier: 4,
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
    blurb: "Longer words, faster snake, more trick letters",
    startTier: 2,
    wordsPerTier: 3,
    maxTier: 6,
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
    blurb: "Long words to spell from memory",
    startTier: 3,
    wordsPerTier: 2,
    maxTier: 7,
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
    blurb: "8 to 15 letter words, a quick look, fastest snake",
    startTier: 5,
    wordsPerTier: 2,
    maxTier: 8,
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

/* ---------- Label Lab ---------- */

export type LabelLevel = {
  blurb: string;
  /** Labels in stage 1; every later stage shows one more… */
  startLabels: number;
  /** …up to this many (stages with fewer parts show them all). */
  maxLabels: number;
  /** Seconds on the clock for each label in stage 1… */
  secondsPerLabel: number;
  /** …losing this much per stage, down to the minimum. */
  shrinkPerRound: number;
  minSecondsPerLabel: number;
  /** Extra wrong words mixed into the word bank. */
  decoys: number;
  /** Seconds lost for a wrong drop. */
  penalty: number;
  /** Make the unlabelled points pulse. */
  pulse: boolean;
};

export const LABEL_LEVELS: Record<ArcadeLevel, LabelLevel> = {
  easy: { blurb: "Fewer labels and lots of time", startLabels: 4, maxLabels: 7, secondsPerLabel: 14, shrinkPerRound: 0.6, minSecondsPerLabel: 8, decoys: 0, penalty: 2, pulse: true },
  medium: { blurb: "More labels, a trick word in the bank", startLabels: 5, maxLabels: 9, secondsPerLabel: 11, shrinkPerRound: 0.6, minSecondsPerLabel: 6, decoys: 1, penalty: 3, pulse: true },
  hard: { blurb: "Every label, two trick words, a faster clock", startLabels: 6, maxLabels: 10, secondsPerLabel: 8, shrinkPerRound: 0.5, minSecondsPerLabel: 4.5, decoys: 2, penalty: 3, pulse: false },
  expert: { blurb: "Every label, three trick words, racing clock", startLabels: 6, maxLabels: 12, secondsPerLabel: 6.5, shrinkPerRound: 0.4, minSecondsPerLabel: 3.5, decoys: 3, penalty: 4, pulse: false },
};

export function labelSeconds(level: LabelLevel, round: number, labels: number) {
  const per = Math.max(level.minSecondsPerLabel, level.secondsPerLabel - level.shrinkPerRound * Math.max(0, round - 1));
  return Math.round(labels * per);
}
