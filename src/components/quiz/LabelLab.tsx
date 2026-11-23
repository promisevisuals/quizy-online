import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Flame, Lightbulb, Play, RotateCcw, Timer } from "lucide-react";
import { ARCADE_LEVELS, LABEL_LEVELS, LEVEL_NAMES, labelSeconds, labelsForRound, loadLevel, saveLevel, type ArcadeLevel } from "@/lib/quiz/arcade";
import { LABEL_DIAGRAMS } from "@/lib/quiz/labelDiagrams";
import { buildRound, nextDiagram, starsFor, type LabelRound } from "@/lib/quiz/labelLab";
import { playTone } from "@/lib/quiz/logic";
import { useQuiz } from "@/lib/quiz/store";
import { GameStage } from "@/components/quiz/GameStage";

type Phase = "pick" | "play" | "cleared" | "over";
type Drag = { word: string; x: number; y: number; moved: boolean; startX: number; startY: number };

const HINT_COST = 3;

/** Label Lab: drag (or tap) words from the bank onto the blanks on a diagram, against the clock. */
export function LabelLab() {
  const age = useQuiz((s) => s.age);
  const park = useQuiz((s) => s.park);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const [level, setLevel] = useState<ArcadeLevel>(() => loadLevel("label", age));
  const cfg = LABEL_LEVELS[level];
  const best = useQuiz((s) => s.arcadeBest[`label-${level}`] ?? 0);

  const [topic, setTopic] = useState("mixed");
  const [phase, setPhase] = useState<Phase>("pick");
  const [round, setRound] = useState(1);
  const [game, setGame] = useState<LabelRound | null>(null);
  const [placed, setPlaced] = useState<Set<number>>(new Set());
  const [bank, setBank] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [labelled, setLabelled] = useState(0);
  const [coins, setCoins] = useState(0);
  const [wrongSlot, setWrongSlot] = useState<number | null>(null);
  const [hintSlot, setHintSlot] = useState<number | null>(null);
  const [penaltyFlash, setPenaltyFlash] = useState("");
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const lastDiagram = useRef("");
  const svgRef = useRef<SVGSVGElement | null>(null);

  const startRound = useCallback(
    (nextRound: number, nextLevel: ArcadeLevel = level, nextTopic = topic) => {
      const c = LABEL_LEVELS[nextLevel];
      const wanted = labelsForRound(c, nextRound);
      const diagram = nextDiagram(c, wanted, nextTopic, lastDiagram.current);
      lastDiagram.current = diagram.id;
      const r = buildRound(diagram, c, wanted);
      const seconds = labelSeconds(c, nextRound, r.targets.length);
      setRound(nextRound);
      setGame(r);
      setPlaced(new Set());
      setBank(r.bank);
      setSelected(null);
      setTotal(seconds * 1000);
      setTimeLeft(seconds * 1000);
      setMistakes(0);
      setHintSlot(null);
      setWrongSlot(null);
      setPhase("play");
    },
    [level, topic],
  );

  const startGame = () => {
    setStreak(0);
    setBestStreak(0);
    setLabelled(0);
    setCoins(0);
    lastDiagram.current = "";
    startRound(1);
  };

  // the clock
  useEffect(() => {
    if (phase !== "play") return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 100) {
          window.clearInterval(id);
          playTone(false);
          setPhase("over");
          return 0;
        }
        return t - 100;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, game]);

  const tryPlace = useCallback(
    (word: string, slot: number) => {
      if (!game || phase !== "play" || placed.has(slot)) return;
      const target = game.targets[slot];
      if (!target) return;
      if (target.word === word) {
        playTone(true);
        const nextPlaced = new Set(placed).add(slot);
        setPlaced(nextPlaced);
        setBank((b) => b.filter((w) => w !== word));
        setSelected(null);
        setHintSlot(null);
        setLabelled((n) => n + 1);
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
        if (nextPlaced.size === game.targets.length) {
          const earned = game.targets.length + Math.floor(timeLeft / 1000 / 5) + (mistakes === 0 ? 3 : 0);
          setCoins((c) => c + earned);
          arcadeReward("label", round, earned);
          arcadeReward(`label-${level}`, round, 0);
          setPhase("cleared");
        }
      } else {
        playTone(false);
        setMistakes((m) => m + 1);
        setStreak(0);
        setWrongSlot(slot);
        setPenaltyFlash(`-${cfg.penalty}s`);
        setTimeLeft((t) => Math.max(0, t - cfg.penalty * 1000));
        window.setTimeout(() => setWrongSlot(null), 450);
        window.setTimeout(() => setPenaltyFlash(""), 700);
      }
    },
    [game, phase, placed, timeLeft, mistakes, round, level, cfg.penalty, arcadeReward],
  );

  /* ---------- drag and drop (with tap-to-place as a fallback) ---------- */
  const slotAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest("[data-slot]");
    const n = el ? Number(el.getAttribute("data-slot")) : NaN;
    return Number.isNaN(n) ? null : n;
  };

  const onChipDown = (word: string, e: React.PointerEvent) => {
    if (phase !== "play") return;
    e.preventDefault();
    const d = { word, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const next = { ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 8 };
      dragRef.current = next;
      setDrag(next);
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      if (d.moved) {
        const slot = slotAt(e.clientX, e.clientY);
        if (slot !== null) tryPlace(d.word, slot);
      } else setSelected((cur) => (cur === d.word ? null : d.word));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, tryPlace]);

  const hoverSlot = drag?.moved ? slotAt(drag.x, drag.y) : null;

  const hint = () => {
    if (!game || phase !== "play") return;
    const word = selected ?? game.targets.find((t, i) => !placed.has(i))?.word;
    const slot = game.targets.findIndex((t, i) => t.word === word && !placed.has(i));
    if (slot < 0 || !word) return;
    setSelected(word);
    setHintSlot(slot);
    setTimeLeft((t) => Math.max(0, t - HINT_COST * 1000));
    setPenaltyFlash(`-${HINT_COST}s`);
    window.setTimeout(() => setPenaltyFlash(""), 700);
  };

  const chooseLevel = (next: ArcadeLevel) => {
    setLevel(next);
    saveLevel("label", next);
  };

  const share = total ? timeLeft / total : 0;
  const stars = phase === "cleared" ? starsFor(timeLeft, total, mistakes) : 0;
  const nextLabels = labelsForRound(cfg, round + 1);
  const topics = useMemo(() => [{ id: "mixed", title: "Mix it up", emoji: "🎲" }, ...LABEL_DIAGRAMS.map((d) => ({ id: d.id, title: d.title, emoji: d.emoji }))], []);

  return (
    <GameStage
      title="Label Lab"
      onBack={() => park("map")}
      stats={
        phase === "pick" ? (
          <span>Best {best ? `round ${best}` : "—"}</span>
        ) : (
          <span>
            {LEVEL_NAMES[level]} · Round {round}
            <span className="block font-bold">
              {labelled} labelled · {coins} coins
            </span>
          </span>
        )
      }
    >
      {phase === "pick" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="lab-hero">
            <span className="text-5xl" aria-hidden>
              🔬
            </span>
            <div>
              <p className="font-display text-2xl font-semibold leading-tight">Label the picture before time runs out!</p>
              <p className="text-sm text-muted">Drag each word to its blank (or tap a word, then tap the blank). Each round adds a label and the clock gets quicker.</p>
            </div>
          </div>
          <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-gold">Level</p>
          <div className="arcade-levels mt-1" role="radiogroup" aria-label="Difficulty">
            {ARCADE_LEVELS.map((item) => (
              <button key={item} type="button" role="radio" aria-checked={item === level} onClick={() => chooseLevel(item)} className={item === level ? "is-active" : ""}>
                {LEVEL_NAMES[item]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-center text-xs font-bold text-muted">{cfg.blurb}.</p>
          <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-gold">Topic</p>
          <div className="lab-topics mt-1">
            {topics.map((t) => (
              <button key={t.id} type="button" onClick={() => setTopic(t.id)} className={topic === t.id ? "is-active" : ""} aria-pressed={topic === t.id}>
                <span className="text-2xl" aria-hidden>
                  {t.emoji}
                </span>
                {t.title}
              </button>
            ))}
          </div>
          <button type="button" onClick={startGame} className="mt-4 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-lg font-extrabold text-primary-fg">
            <Play className="size-5" aria-hidden /> Start labelling
          </button>
        </div>
      ) : game ? (
        <>
          <div className="lab-clock" aria-label={`${Math.ceil(timeLeft / 1000)} seconds left`}>
            <span className={share < 0.25 ? "is-low" : ""} style={{ width: `${share * 100}%` }} />
            <b className="lab-clock-text">
              <Timer className="size-4" aria-hidden /> {Math.ceil(timeLeft / 1000)}s
              {penaltyFlash ? <em className="lab-penalty">{penaltyFlash}</em> : null}
            </b>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <p className="truncate font-display text-lg font-semibold">
              {game.diagram.emoji} {game.diagram.title}
            </p>
            <div className="flex items-center gap-2">
              {streak >= 3 ? (
                <span className="lab-streak">
                  <Flame className="size-4" aria-hidden /> {streak} in a row!
                </span>
              ) : null}
              <button type="button" onClick={hint} disabled={phase !== "play"} className="lab-hint" aria-label={`Hint, costs ${HINT_COST} seconds`}>
                <Lightbulb className="size-4" aria-hidden /> Hint −{HINT_COST}s
              </button>
            </div>
          </div>

          <div className="lab-board">
            <svg ref={svgRef} viewBox="0 0 480 400" className="lab-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Diagram: ${game.diagram.title}`}>
              <g dangerouslySetInnerHTML={{ __html: game.diagram.art }} />
              {game.targets.map((t, i) => {
                const [ax, ay] = t.part.at;
                const [sx, sy] = t.part.slot;
                const w = Math.min(150, Math.max(92, t.word.length * 10 + 26));
                const side = Math.abs(ax - sx) > w / 2;
                const lx = side ? (ax > sx ? sx + w / 2 : sx - w / 2) : sx;
                const ly = side ? sy : ay > sy ? sy + 16 : sy - 16;
                const done = placed.has(i);
                const ready = !done && (selected !== null || hoverSlot === i);
                return (
                  <g key={t.part.word}>
                    <line x1={lx} y1={ly} x2={ax} y2={ay} className={done ? "lab-line is-done" : "lab-line"} />
                    <circle cx={ax} cy={ay} r={5} className={`lab-dot ${done ? "is-done" : cfg.pulse ? "is-pulse" : ""}`} />
                    <g
                      data-slot={i}
                      className={`lab-slot ${done ? "is-done" : ""} ${ready ? "is-ready" : ""} ${hoverSlot === i ? "is-hover" : ""} ${wrongSlot === i ? "is-wrong" : ""} ${hintSlot === i ? "is-hint" : ""}`}
                      onClick={() => selected && tryPlace(selected, i)}
                      role="button"
                      aria-label={done ? t.word : "Empty label"}
                    >
                      <rect x={sx - w / 2} y={sy - 16} width={w} height={32} rx={10} />
                      <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="central">
                        {done ? t.word : "?"}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {phase === "cleared" ? (
              <div className="lab-overlay" role="status">
                <p className="text-4xl text-gold">
                  {"★".repeat(stars)}
                  {"☆".repeat(3 - stars)}
                </p>
                <p className="font-display text-2xl font-semibold">Round {round} labelled!</p>
                <p className="text-sm text-muted">
                  {Math.ceil(timeLeft / 1000)}s to spare{mistakes === 0 ? " · perfect, +3 bonus coins" : ""}
                  {bestStreak >= 3 ? ` · best streak ${bestStreak}` : ""}
                </p>
                <p className="mt-1 text-sm font-bold">Next: {nextLabels} labels, quicker clock</p>
                <button type="button" onClick={() => startRound(round + 1)} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 font-extrabold text-primary-fg">
                  Next round <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            ) : null}
            {phase === "over" ? (
              <div className="lab-overlay" role="status">
                <p className="font-display text-3xl font-semibold">Time's up!</p>
                <p className="text-sm text-muted">
                  You reached round {round} and labelled {labelled} {labelled === 1 ? "part" : "parts"}. {coins} coins earned.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={startGame} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 font-extrabold text-primary-fg">
                    <RotateCcw className="size-4" aria-hidden /> Play again
                  </button>
                  <button type="button" onClick={() => setPhase("pick")} className="inline-flex min-h-12 items-center rounded-2xl border border-line bg-surface px-4 font-extrabold">
                    Change level
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="lab-bank" aria-label="Word bank">
            {bank.map((word) => (
              <button
                key={word}
                type="button"
                className={`lab-chip ${selected === word ? "is-selected" : ""} ${drag?.word === word && drag.moved ? "is-lifted" : ""}`}
                onPointerDown={(e) => onChipDown(word, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected((s) => (s === word ? null : word));
                  }
                }}
                aria-pressed={selected === word}
              >
                {word}
              </button>
            ))}
            {phase === "play" && bank.length && selected ? <p className="w-full text-center text-xs font-bold text-muted">Now tap the blank where “{selected}” goes</p> : null}
          </div>

          {drag?.moved ? (
            <div className="lab-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
              {drag.word}
            </div>
          ) : null}
        </>
      ) : null}
    </GameStage>
  );
}
