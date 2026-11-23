import { LABEL_TOPICS, type LabelPart, type LabelSide, type LabelStage, type LabelTopic } from "./labelDiagrams.ts";
import type { LabelLevel } from "./arcade.ts";

/** Drawings are 480 × 480. */
export const BOX = 480;
const EDGE = 4;
const SLOT_H = 32;
const ROW_GAP = 38;
const TOP_ROW = 22;
const BOTTOM_ROW = BOX - 22;

export type Slot = {
  side: LabelSide;
  /** centre of the blank */
  x: number;
  y: number;
  w: number;
  h: number;
  font: number;
  /** where the leader line leaves the blank */
  lx: number;
  ly: number;
};
export type LabelTarget = { part: LabelPart; word: string; slot: Slot };
export type LabelRound = { topic: LabelTopic; stage: LabelStage; stageNo: number; targets: LabelTarget[]; bank: string[] };

function shuffled<T>(items: T[], rnd: () => number) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Long names get a slightly smaller font so the blank stays narrow. */
export function slotSize(word: string) {
  const font = word.length > 13 ? 13 : 15;
  return { font, w: Math.round(word.length * font * 0.57 + 22), h: SLOT_H };
}

export function sideOf(part: LabelPart): LabelSide {
  return part.side ?? (part.at[0] < BOX / 2 ? "left" : "right");
}

/**
 * Place the blanks for the parts in play: each side column (or row) is sorted by where its
 * points are, kept close to them, and nudged apart so no two blanks ever overlap.
 */
export function layoutSlots(parts: LabelPart[], words: string[] = parts.map((p) => p.word)): Slot[] {
  const slots: Slot[] = parts.map((part, i) => {
    const { font, w, h } = slotSize(words[i] ?? part.word);
    return { side: sideOf(part), x: 0, y: 0, w, h, font, lx: 0, ly: 0 };
  });
  const bySide = (side: LabelSide) => slots.map((s, i) => i).filter((i) => slots[i]!.side === side);

  for (const side of ["left", "right"] as const) {
    const idx = bySide(side).sort((a, b) => parts[a]!.at[1] - parts[b]!.at[1]);
    const ys = idx.map((i) => Math.min(BOX - TOP_ROW, Math.max(TOP_ROW, parts[i]!.at[1])));
    for (let k = 1; k < ys.length; k++) ys[k] = Math.max(ys[k]!, ys[k - 1]! + ROW_GAP);
    if (ys.length && ys[ys.length - 1]! > BOX - TOP_ROW) {
      ys[ys.length - 1] = BOX - TOP_ROW;
      for (let k = ys.length - 2; k >= 0; k--) ys[k] = Math.min(ys[k]!, ys[k + 1]! - ROW_GAP);
    }
    idx.forEach((i, k) => {
      const s = slots[i]!;
      s.y = ys[k]!;
      s.x = side === "left" ? EDGE + s.w / 2 : BOX - EDGE - s.w / 2;
      s.lx = side === "left" ? EDGE + s.w : BOX - EDGE - s.w;
      s.ly = s.y;
    });
  }

  for (const side of ["top", "bottom"] as const) {
    const idx = bySide(side).sort((a, b) => parts[a]!.at[0] - parts[b]!.at[0]);
    const w = idx.map((i) => slots[i]!.w);
    const xs = idx.map((i, k) => Math.min(BOX - EDGE - w[k]! / 2, Math.max(EDGE + w[k]! / 2, parts[i]!.at[0])));
    for (let k = 1; k < xs.length; k++) xs[k] = Math.max(xs[k]!, xs[k - 1]! + (w[k - 1]! + w[k]!) / 2 + 6);
    const last = xs.length - 1;
    if (last >= 0 && xs[last]! > BOX - EDGE - w[last]! / 2) {
      xs[last] = BOX - EDGE - w[last]! / 2;
      for (let k = last - 1; k >= 0; k--) xs[k] = Math.min(xs[k]!, xs[k + 1]! - (w[k]! + w[k + 1]!) / 2 - 6);
    }
    idx.forEach((i, k) => {
      const s = slots[i]!;
      s.x = xs[k]!;
      s.y = side === "top" ? TOP_ROW : BOTTOM_ROW;
      s.lx = s.x;
      s.ly = side === "top" ? s.y + SLOT_H / 2 : s.y - SLOT_H / 2;
    });
  }
  return slots;
}

/* ---------- trick words ---------- */

/** Words that name the same thing, so one is never a "wrong" chip next to the other. */
const SAME: string[][] = [
  ["tummy", "stomach", "belly", "abdomen"],
  ["spine", "backbone", "vertebrae"],
  ["chest", "thorax"],
  ["femur", "thigh bone", "thigh"],
  ["tibia", "shin bone", "shin"],
  ["patella", "kneecap", "knee"],
  ["sternum", "breastbone"],
  ["clavicle", "collarbone"],
  ["humerus", "upper arm bone"],
  ["mandible", "jaw", "mouthparts", "mouth"],
  ["cranium", "skull", "head"],
  ["phalanges", "finger bones", "toes", "fingers"],
  ["pelvis", "hip bone", "hip"],
  ["tarsals", "tarsus", "ankle"],
  ["windpipe", "trachea"],
  ["food pipe", "oesophagus"],
  ["rain", "precipitation"],
  ["leaf", "blade"],
];

const norm = (w: string) => w.toLowerCase().replace(/s$/, "");
function family(word: string) {
  const n = norm(word);
  const set = new Set([n]);
  for (const group of SAME) if (group.some((g) => norm(g) === n)) group.forEach((g) => set.add(norm(g)));
  return set;
}
/** Do two words clash: the same word, a synonym, or one inside the other ("eye" in "compound eye")? */
export function clashes(a: string, b: string) {
  const fa = family(a);
  const fb = family(b);
  for (const x of fa) {
    for (const y of fb) {
      if (x === y) return true;
      if (` ${x} `.includes(` ${y} `) || ` ${y} `.includes(` ${x} `)) return true;
    }
  }
  return false;
}

/** Trick words come from other kinds of topic, at about the same stage, and never name a real part here. */
export function decoysFor(topic: LabelTopic, stageNo: number, count: number, rnd: () => number = Math.random) {
  if (count <= 0) return [];
  const taken = LABEL_TOPICS.filter((t) => t.group === topic.group).flatMap((t) => t.stages.flatMap((s) => s.parts.map((p) => p.word)));
  const near: string[] = [];
  const far: string[] = [];
  for (const t of LABEL_TOPICS) {
    if (t.group === topic.group) continue;
    t.stages.forEach((s, i) => {
      for (const p of s.parts) (Math.abs(i + 1 - stageNo) <= 1 ? near : far).push(p.word);
    });
  }
  const picked: string[] = [];
  for (const word of [...shuffled([...new Set(near)], rnd), ...shuffled([...new Set(far)], rnd)]) {
    if (picked.length >= count) break;
    if (taken.some((t) => clashes(t, word)) || picked.some((p) => clashes(p, word))) continue;
    picked.push(word);
  }
  return picked;
}

/* ---------- rounds ---------- */

export function topicById(id: string) {
  return LABEL_TOPICS.find((t) => t.id === id);
}

/** How many labels a round shows: young players get fewer, and every stage adds one. */
export function labelsFor(level: LabelLevel, stageNo: number, available: number) {
  return Math.min(available, level.maxLabels, level.startLabels + Math.max(0, stageNo - 1));
}

/** Build a round: the stage's parts (a random handful when the level shows fewer), blanks laid out, and the word bank. */
export function buildRound(topic: LabelTopic, stageNo: number, level: LabelLevel, rnd: () => number = Math.random): LabelRound {
  const stage = topic.stages[Math.min(topic.stages.length, Math.max(1, stageNo)) - 1]!;
  const wanted = labelsFor(level, stageNo, stage.parts.length);
  const chosen = wanted >= stage.parts.length ? stage.parts : shuffled(stage.parts, rnd).slice(0, wanted);
  const slots = layoutSlots(chosen);
  const targets = chosen.map((part, i) => ({ part, word: part.word, slot: slots[i]! }));
  const bank = shuffled([...targets.map((t) => t.word), ...decoysFor(topic, stageNo, level.decoys, rnd)], rnd);
  return { topic, stage, stageNo, targets, bank };
}

/**
 * What comes after a cleared stage. One topic: its next stage, until it is finished (null).
 * Mix it up: stage N of a random topic that has one, never the same topic twice running.
 */
export function nextPlan(choice: string, stageNo: number, lastTopic: string, rnd: () => number = Math.random): { topic: LabelTopic; stageNo: number } | null {
  if (choice !== "mixed") {
    const topic = topicById(choice);
    return topic && stageNo <= topic.stages.length ? { topic, stageNo } : null;
  }
  const open = LABEL_TOPICS.filter((t) => t.stages.length >= stageNo);
  const fresh = open.filter((t) => t.id !== lastTopic);
  const pool = fresh.length ? fresh : open;
  if (!pool.length) return null;
  return { topic: pool[Math.floor(rnd() * pool.length)]!, stageNo };
}

export function starsFor(timeLeft: number, total: number, mistakes: number) {
  const share = total ? timeLeft / total : 0;
  const stars = share >= 0.5 ? 3 : share >= 0.25 ? 2 : 1;
  return Math.max(1, stars - (mistakes >= 3 ? 1 : 0));
}

/* ---------- unlocked stages (kept on this device) ---------- */

const reachedKey = (topic: string) => `quizy-label-reached-${topic}`;

/** The furthest stage of a topic this player may start from (1 = only the first). */
export function loadReached(topic: string) {
  try {
    const n = Number(localStorage.getItem(reachedKey(topic)));
    const max = topicById(topic)?.stages.length ?? 1;
    return Number.isFinite(n) && n >= 1 ? Math.min(max, Math.floor(n)) : 1;
  } catch {
    return 1;
  }
}

/** Clearing a stage unlocks the next one as a starting point. */
export function unlockAfter(topic: string, clearedStage: number) {
  const max = topicById(topic)?.stages.length ?? 1;
  const next = Math.min(max, clearedStage + 1);
  try {
    if (next > loadReached(topic)) localStorage.setItem(reachedKey(topic), String(next));
  } catch {
    /* private mode: progress just isn't kept */
  }
}
