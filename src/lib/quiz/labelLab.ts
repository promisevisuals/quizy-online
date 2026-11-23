import { labelFor, LABEL_DIAGRAMS, type LabelDiagram, type LabelPart } from "./labelDiagrams.ts";
import type { LabelLevel } from "./arcade.ts";

export type LabelTarget = { part: LabelPart; word: string };
export type LabelRound = { diagram: LabelDiagram; targets: LabelTarget[]; bank: string[] };

function shuffled<T>(items: T[], rnd: () => number) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Build one round: pick the parts to label (easiest tiers first, so young players get everyday words),
 * then the word bank: the right words plus a few trick words from other diagrams.
 */
export function buildRound(diagram: LabelDiagram, level: LabelLevel, wanted: number, rnd: () => number = Math.random): LabelRound {
  const allowed = diagram.parts.filter((p) => p.tier <= level.maxTier);
  const extra = diagram.parts.filter((p) => p.tier > level.maxTier).sort((a, b) => a.tier - b.tier);
  const pool = [...shuffled(allowed, rnd), ...extra];
  const chosen = pool.slice(0, Math.min(wanted, diagram.parts.length));
  const targets = chosen.map((part) => ({ part, word: labelFor(part, level.scientific) }));
  const used = new Set(diagram.parts.map((p) => labelFor(p, level.scientific)));
  const decoyPool = shuffled(
    [...new Set(LABEL_DIAGRAMS.filter((d) => d.id !== diagram.id).flatMap((d) => d.parts.filter((p) => p.tier <= level.maxTier).map((p) => labelFor(p, level.scientific))))].filter(
      (w) => !used.has(w),
    ),
    rnd,
  );
  const bank = shuffled([...targets.map((t) => t.word), ...decoyPool.slice(0, level.decoys)], rnd);
  return { diagram, targets, bank };
}

/** Diagrams that have enough words for this level; the flower's science parts wait for Hard. */
export function diagramsFor(level: LabelLevel, wanted: number) {
  const ok = LABEL_DIAGRAMS.filter((d) => d.parts.filter((p) => p.tier <= level.maxTier).length >= Math.min(wanted, 3));
  return ok.length ? ok : LABEL_DIAGRAMS;
}

/** Pick the diagram for a round: the chosen topic, or a mixed run that never repeats back to back. */
export function nextDiagram(level: LabelLevel, wanted: number, topic: string, last: string, rnd: () => number = Math.random) {
  if (topic !== "mixed") return LABEL_DIAGRAMS.find((d) => d.id === topic) ?? LABEL_DIAGRAMS[0]!;
  const options = diagramsFor(level, wanted).filter((d) => d.id !== last);
  return options[Math.floor(rnd() * options.length)] ?? LABEL_DIAGRAMS[0]!;
}

export function starsFor(timeLeft: number, total: number, mistakes: number) {
  const share = total ? timeLeft / total : 0;
  const stars = share >= 0.5 ? 3 : share >= 0.25 ? 2 : 1;
  return Math.max(1, stars - (mistakes >= 3 ? 1 : 0));
}
