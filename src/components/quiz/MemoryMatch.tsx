import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { playTone, shuffle } from "@/lib/quiz/logic";
import { useQuiz } from "@/lib/quiz/store";

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
    ],
  },
  {
    name: "Ocean",
    cards: [
      { face: "🐬", label: "Dolphin" },
      { face: "🐙", label: "Octopus" },
      { face: "🦀", label: "Crab" },
      { face: "🐠", label: "Fish" },
      { face: "🐳", label: "Whale" },
      { face: "🦈", label: "Shark" },
      { face: "🪼", label: "Jellyfish" },
      { face: "⭐", label: "Starfish" },
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
    ],
  },
];

type Card = { key: number; face: string; label: string };

function deal(pairs: number, deckIndex: number): Card[] {
  const deck = DECKS[deckIndex % DECKS.length] ?? DECKS[0]!;
  const chosen = shuffle(deck.cards).slice(0, pairs);
  return shuffle(chosen.flatMap((c, i) => [
    { key: i * 2, ...c },
    { key: i * 2 + 1, ...c },
  ]));
}

export function MemoryMatch() {
  const age = useQuiz((s) => s.age);
  const best = useQuiz((s) => s.arcadeBest.memory ?? 0);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const park = useQuiz((s) => s.park);
  const pairs = age === "young" ? 6 : 8;
  const [deckIndex, setDeckIndex] = useState(0);
  const [cards, setCards] = useState<Card[]>(() => deal(pairs, 0));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [paid, setPaid] = useState(false);

  const done = matched.size === pairs;
  const stars = useMemo(() => {
    const extra = moves - pairs;
    return extra <= 2 ? 3 : extra <= 6 ? 2 : 1;
  }, [moves, pairs]);

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open.map((i) => cards[i]);
    if (a && b && a.face === b.face) {
      playTone(true);
      setMatched((m) => new Set(m).add(a.face));
      setOpen([]);
      return;
    }
    const id = window.setTimeout(() => setOpen([]), 850);
    return () => window.clearTimeout(id);
  }, [open, cards]);

  useEffect(() => {
    if (!done || paid) return;
    setPaid(true);
    // stars double as the score; 5 coins a star
    arcadeReward("memory", stars, stars * 5);
  }, [done, paid, stars, arcadeReward]);

  const flip = (index: number) => {
    const card = cards[index];
    if (!card || open.length >= 2 || open.includes(index) || matched.has(card.face)) return;
    const next = [...open, index];
    setOpen(next);
    if (next.length === 2) setMoves((m) => m + 1);
  };

  const again = () => {
    const nextDeck = deckIndex + 1;
    setDeckIndex(nextDeck);
    setCards(deal(pairs, nextDeck));
    setOpen([]);
    setMatched(new Set());
    setMoves(0);
    setPaid(false);
  };

  return (
    <section className="mx-auto max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => park("map")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 font-extrabold">
          <ArrowLeft className="size-4" aria-hidden /> Trail
        </button>
        <p className="text-sm font-extrabold text-muted">
          {DECKS[deckIndex % DECKS.length]?.name} · Moves {moves} · Best {"★".repeat(best) || "—"}
        </p>
      </div>
      <h2 className="mt-3 font-display text-3xl font-semibold">Memory Match</h2>
      <p className="text-muted">Flip two cards. Find all {pairs} pairs in as few moves as you can.</p>
      <div className={age === "young" ? "memory-grid is-small mt-4" : "memory-grid mt-4"}>
        {cards.map((card, index) => {
          const shown = open.includes(index) || matched.has(card.face);
          return (
            <button
              key={card.key}
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
      {done && (
        <div className="mt-4 rounded-card border border-gold bg-surface p-5 text-center" role="status">
          <p className="text-4xl text-gold">{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>
          <p className="mt-2 font-display text-2xl font-semibold">All pairs found in {moves} moves!</p>
          <p className="text-muted">+{stars * 5} coins</p>
          <button type="button" onClick={again} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 font-extrabold text-primary-fg">
            <RotateCcw className="size-4" aria-hidden /> New deck
          </button>
        </div>
      )}
    </section>
  );
}
