import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Timer } from "lucide-react";
import { ARCADE_LEVELS, LEVEL_NAMES, MEMORY_LEVELS, loadLevel, pairsForRound, saveLevel, secondsForRound, type ArcadeLevel } from "@/lib/quiz/arcade";
import { playTone, shuffle } from "@/lib/quiz/logic";
import { useQuiz } from "@/lib/quiz/store";

/** 15 faces per deck so the biggest rounds (15 pairs) never repeat a picture. */
const DECKS: { name: string; cards: { face: string; label: string }[] }[] = [
  {
    name: "Jungle",
    cards: [
      { face: "🦁", label: "Lion" },
      { face: "🐘", label: "Elephant" },
      { face: "🦒", label: "Giraffe" },
      { face: "🐒", label: "Monkey" },
      { face: "🦜", label: "Parrot" },
      { face: "🐊", label: "Crocodile" },
      { face: "🦓", label: "Zebra" },
      { face: "🐢", label: "Tortoise" },
      { face: "🦛", label: "Hippo" },
      { face: "🦏", label: "Rhino" },
      { face: "🐆", label: "Leopard" },
      { face: "🐍", label: "Snake" },
      { face: "🦩", label: "Flamingo" },
      { face: "🐗", label: "Warthog" },
      { face: "🦔", label: "Hedgehog" },
    ],
  },
  {
    name: "Ocean",
    cards: [
      { face: "🐬", label: "Dolphin" },
      { face: "🐙", label: "Octopus" },
      { face: "🦀", label: "Crab" },
      { face: "🐠", label: "Tropical fish" },
      { face: "🐳", label: "Whale" },
      { face: "🦈", label: "Shark" },
      { face: "🦑", label: "Squid" },
      { face: "⭐", label: "Starfish" },
      { face: "🐡", label: "Pufferfish" },
      { face: "🦭", label: "Seal" },
      { face: "🦞", label: "Lobster" },
      { face: "🐚", label: "Shell" },
      { face: "🐧", label: "Penguin" },
      { face: "🦐", label: "Shrimp" },
      { face: "⛵", label: "Sailboat" },
    ],
  },
  {
    name: "Space",
    cards: [
      { face: "🚀", label: "Rocket" },
      { face: "🪐", label: "Planet" },
      { face: "🌙", label: "Moon" },
      { face: "☀️", label: "Sun" },
      { face: "☄️", label: "Comet" },
      { face: "🛰️", label: "Satellite" },
      { face: "👩‍🚀", label: "Astronaut" },
      { face: "🌍", label: "Earth" },
      { face: "👽", label: "Alien" },
      { face: "🛸", label: "Flying saucer" },
      { face: "🔭", label: "Telescope" },
      { face: "🌌", label: "Galaxy" },
      { face: "🌠", label: "Shooting star" },
      { face: "⭐", label: "Star" },
      { face: "🌑", label: "New moon" },
    ],
  },
];

type Card = { key: number; face: string; label: string };

function deal(pairs: number, deckIndex: number): Card[] {
  const deck = DECKS[deckIndex % DECKS.length] ?? DECKS[0]!;
  const chosen = shuffle(deck.cards).slice(0, pairs);
  return shuffle(
    chosen.flatMap((c, i) => [
      { key: i * 2, ...c },
      { key: i * 2 + 1, ...c },
    ]),
  );
}

/** More cards → more columns and square cards, so even 30 cards fit on a phone screen. */
function columnsFor(cards: number) {
  if (cards <= 12) return "";
  if (cards <= 16) return "is-square";
  if (cards <= 20) return "cols-5 is-square";
  return "cols-6 is-square";
}

export function MemoryMatch() {
  const age = useQuiz((s) => s.age);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const park = useQuiz((s) => s.park);
  const [level, setLevel] = useState<ArcadeLevel>(() => loadLevel("memory", age));
  const cfg = MEMORY_LEVELS[level];
  const best = useQuiz((s) => s.arcadeBest[`memory-${level}`] ?? 0);

  const [round, setRound] = useState(1);
  const pairs = pairsForRound(cfg, round);
  const [deckIndex, setDeckIndex] = useState(0);
  const [cards, setCards] = useState<Card[]>(() => deal(pairsForRound(MEMORY_LEVELS[loadLevel("memory", age)], 1), 0));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [paid, setPaid] = useState(false);
  const [peeking, setPeeking] = useState(cfg.peekMs > 0);
  const totalSeconds = secondsForRound(cfg, round, pairs);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [timeUp, setTimeUp] = useState(false);

  const done = matched.size === pairs && cards.length === pairs * 2;
  const stars = useMemo(() => {
    const extra = moves - pairs;
    return extra <= Math.ceil(pairs / 4) ? 3 : extra <= Math.ceil(pairs / 2) + 2 ? 2 : 1;
  }, [moves, pairs]);

  /** Lay out a round: fresh cards, optional peek, fresh clock. */
  function startRound(nextRound: number, nextLevel: ArcadeLevel = level, nextDeck = deckIndex + 1) {
    const c = MEMORY_LEVELS[nextLevel];
    const p = pairsForRound(c, nextRound);
    setRound(nextRound);
    setDeckIndex(nextDeck);
    setCards(deal(p, nextDeck));
    setOpen([]);
    setMatched(new Set());
    setMoves(0);
    setPaid(false);
    setTimeUp(false);
    setPeeking(c.peekMs > 0);
    setSecondsLeft(secondsForRound(c, nextRound, p));
  }

  // the peek: every card face up for a moment at the start of a round
  useEffect(() => {
    if (!peeking) return;
    const id = window.setTimeout(() => setPeeking(false), cfg.peekMs);
    return () => window.clearTimeout(id);
  }, [peeking, cfg.peekMs, deckIndex]);

  // the round clock (harder levels)
  useEffect(() => {
    if (!totalSeconds || peeking || done || timeUp) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setTimeUp(true);
          playTone(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [totalSeconds, peeking, done, timeUp, deckIndex]);

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open.map((i) => cards[i]);
    if (a && b && a.face === b.face) {
      playTone(true);
      setMatched((m) => new Set(m).add(a.face));
      setOpen([]);
      return;
    }
    const id = window.setTimeout(() => setOpen([]), cfg.flipBackMs);
    return () => window.clearTimeout(id);
  }, [open, cards, cfg.flipBackMs]);

  useEffect(() => {
    if (!done || paid) return;
    setPaid(true);
    // bigger rounds and harder levels pay more
    const levelBonus = { easy: 0, medium: 2, hard: 4, expert: 6 }[level];
    arcadeReward("memory", stars, stars * 2 + Math.ceil(pairs / 2) + levelBonus);
    arcadeReward(`memory-${level}`, round, 0);
  }, [done, paid, stars, pairs, level, round, arcadeReward]);

  const flip = (index: number) => {
    const card = cards[index];
    if (peeking || timeUp || done) return;
    if (!card || open.length >= 2 || open.includes(index) || matched.has(card.face)) return;
    const next = [...open, index];
    setOpen(next);
    if (next.length === 2) setMoves((m) => m + 1);
  };

  const chooseLevel = (next: ArcadeLevel) => {
    if (next === level) return;
    setLevel(next);
    saveLevel("memory", next);
    startRound(1, next);
  };
  const canChooseLevel = round === 1 && moves === 0;
  const lowTime = totalSeconds > 0 && secondsLeft <= Math.max(5, Math.round(totalSeconds * 0.2));

  return (
    <section className="mx-auto max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => park("map")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 font-extrabold">
          <ArrowLeft className="size-4" aria-hidden /> Trail
        </button>
        <p className="text-right text-sm font-extrabold text-muted">
          {LEVEL_NAMES[level]} · Round {round}
          <span className="block text-xs">
            {pairs} pairs · Moves {moves} · Best round {Math.max(best, done ? round : round - 1) || "—"}
          </span>
        </p>
      </div>

      {canChooseLevel ? (
        <div className="mt-3">
          <div className="arcade-levels" role="radiogroup" aria-label="Difficulty">
            {ARCADE_LEVELS.map((item) => (
              <button key={item} type="button" role="radio" aria-checked={item === level} onClick={() => chooseLevel(item)} className={item === level ? "is-active" : ""}>
                {LEVEL_NAMES[item]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-center text-xs font-bold text-muted">{cfg.blurb}. More cards every round.</p>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Memory Match</h2>
        {totalSeconds ? (
          <p className={`memory-timer inline-flex items-center gap-1 text-lg font-extrabold ${lowTime ? "is-low" : ""}`} aria-live="polite">
            <Timer className="size-5" aria-hidden /> {secondsLeft}s
          </p>
        ) : null}
      </div>
      <p className="text-sm text-muted">
        {peeking ? "Look closely! The cards turn over in a moment…" : `Flip two cards at a time. Find all ${pairs} pairs.`}
      </p>

      <div className={`memory-grid mt-3 ${columnsFor(cards.length)}`}>
        {cards.map((card, index) => {
          const shown = peeking || open.includes(index) || matched.has(card.face);
          return (
            <button
              key={`${deckIndex}-${card.key}`}
              type="button"
              onClick={() => flip(index)}
              className={`memory-card ${shown ? "is-shown" : ""} ${matched.has(card.face) ? "is-matched" : ""}`}
              aria-label={shown ? card.label : "Hidden card"}
            >
              <span className="memory-inner">
                <span className="memory-back" aria-hidden>
                  ?
                </span>
                <span className="memory-face" aria-hidden>
                  {card.face}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {done ? (
        <div className="mt-4 rounded-card border border-gold bg-surface p-5 text-center" role="status">
          <p className="text-4xl text-gold">
            {"★".repeat(stars)}
            {"☆".repeat(3 - stars)}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            Round {round} cleared in {moves} moves!
          </p>
          <p className="text-muted">
            {pairsForRound(cfg, round + 1) > pairs ? `Next round: ${pairsForRound(cfg, round + 1)} pairs` : "Next round: same size, new cards"}
            {cfg.secondsPerPair ? ", less time" : ""}.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => startRound(round + 1)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 font-extrabold text-primary-fg">
              Next round <ArrowRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => startRound(1)}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 font-extrabold"
            >
              <RotateCcw className="size-4" aria-hidden /> Start over
            </button>
          </div>
        </div>
      ) : null}

      {timeUp && !done ? (
        <div className="mt-4 rounded-card border border-bad bg-surface p-5 text-center" role="status">
          <p className="font-display text-2xl font-semibold">Time's up!</p>
          <p className="text-muted">
            You found {matched.size} of {pairs} pairs. Try round {round} again.
          </p>
          <button type="button" onClick={() => startRound(round)} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 font-extrabold text-primary-fg">
            <RotateCcw className="size-4" aria-hidden /> Try again
          </button>
        </div>
      ) : null}
    </section>
  );
}
