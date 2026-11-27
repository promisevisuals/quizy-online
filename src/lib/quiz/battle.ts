/**
 * Shared rules for two-player battles (online rooms and Bluetooth).
 * The players choose what to play; the phone that sets the game builds the questions
 * from the app's own bank, so King's Bible Quest battles use Bible questions.
 */
import { lands, pickLandQuestions, pickMixed, type Age, type Difficulty, type PlayItem } from "@/lib/quiz/logic";

export type BattleSettings = {
  /** A land / section id, or "mix" for questions from everywhere. */
  landId: string;
  age: Age;
  difficulty: Difficulty;
  /** Advanced mode name (only when difficulty is "advanced"). */
  mode: string;
  count: number;
};

export type BattleQuestion = { id: string; q: string; opts: string[]; a: number; exp: string };

export const BATTLE_COUNTS = [5, 10, 15] as const;
export const MIX = "mix";

/** Sections that can be played head to head (spelling rounds need typing, so they stay solo). */
export function battleLands() {
  return lands.filter((land) => land.mode !== "spelling" && land.questions.some((q) => q.kind === "choice"));
}

export function defaultSettings(age: Age, difficulty: Difficulty, mode = ""): BattleSettings {
  return { landId: MIX, age, difficulty, mode: difficulty === "advanced" ? mode || "Beast Mode" : "", count: 10 };
}

export function cleanSettings(raw: Partial<BattleSettings> | null | undefined): BattleSettings {
  const ids = new Set(battleLands().map((l) => l.id));
  const difficulty: Difficulty = ["easy", "medium", "difficult", "advanced"].includes(String(raw?.difficulty))
    ? (raw!.difficulty as Difficulty)
    : "easy";
  const count = BATTLE_COUNTS.includes(Number(raw?.count) as (typeof BATTLE_COUNTS)[number]) ? Number(raw?.count) : 10;
  return {
    landId: raw?.landId && (raw.landId === MIX || ids.has(raw.landId)) ? raw.landId : MIX,
    age: raw?.age === "old" ? "old" : "young",
    difficulty,
    mode: difficulty === "advanced" ? String(raw?.mode || "Beast Mode").slice(0, 40) : "",
    count,
  };
}

function toBattle(item: PlayItem): BattleQuestion | null {
  if (item.kind !== "choice") return null;
  return { id: item.id, q: item.q, opts: item.opts.slice(), a: item.a, exp: item.exp ?? "" };
}

/** Build the question set for a battle. Falls back to a mix when a section runs short. */
export function buildBattleQuestions(settings: BattleSettings, rnd: () => number = Math.random): BattleQuestion[] {
  const s = cleanSettings(settings);
  const out: BattleQuestion[] = [];
  const seen = new Set<string>();
  const add = (items: PlayItem[]) => {
    for (const item of items) {
      const q = toBattle(item);
      if (!q || seen.has(q.q)) continue;
      seen.add(q.q);
      out.push(q);
      if (out.length >= s.count) break;
    }
  };
  if (s.landId !== MIX) {
    const land = lands.find((l) => l.id === s.landId);
    if (land) {
      // A section round is normally 10 questions; draw twice to reach 15.
      for (let tries = 0; tries < 3 && out.length < s.count; tries++) {
        add(pickLandQuestions({ ...land, count: s.count }, s.age, s.difficulty, out.map((q) => q.id)));
      }
    }
  }
  if (out.length < s.count) add(pickMixed(s.age, s.difficulty, s.count * 2, rnd));
  return out.slice(0, s.count);
}

export function landName(landId: string) {
  if (landId === MIX) return "Mix of everything";
  return lands.find((l) => l.id === landId)?.name ?? "Mix of everything";
}

export function difficultyName(d: Difficulty) {
  return d === "easy" ? "Easy" : d === "medium" ? "Medium" : d === "difficult" ? "Hard" : "Advanced";
}

/** Who took a round: "me", "them", "both" (both right) or "none" (both missed). */
export function roundVerdict(meCorrect: boolean, themCorrect: boolean): "me" | "them" | "both" | "none" {
  if (meCorrect && themCorrect) return "both";
  if (meCorrect) return "me";
  if (themCorrect) return "them";
  return "none";
}

/** Final line from one player's side. */
export function finalLine(me: { name: string; score: number }, them: { name: string; score: number }) {
  if (me.score > them.score) return { head: "You win!", tone: "win" as const };
  if (me.score < them.score) return { head: `${them.name} wins!`, tone: "lose" as const };
  return { head: "It's a draw!", tone: "draw" as const };
}
