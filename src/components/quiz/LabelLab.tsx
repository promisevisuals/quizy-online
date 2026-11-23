import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Eye, Flame, Lightbulb, Lock, Play, RotateCcw, Timer, Trophy } from "lucide-react";
import { ARCADE_LEVELS, LABEL_LEVELS, LEVEL_NAMES, labelSeconds, loadLevel, saveLevel, type ArcadeLevel } from "@/lib/quiz/arcade";
import { LABEL_TOPICS } from "@/lib/quiz/labelDiagrams";
import { BOX, buildRound, labelsFor, loadReached, nextPlan, starsFor, topicById, unlockAfter, type LabelRound } from "@/lib/quiz/labelLab";
import { playTone } from "@/lib/quiz/logic";
import { useQuiz } from "@/lib/quiz/store";
import { GameStage } from "@/components/quiz/GameStage";

type Phase = "pick" | "play" | "cleared" | "over";
type Drag = { word: string; x: number; y: number; moved: boolean; startX: number; startY: number };

const HINT_COST = 3;

/**
 * Label Lab: drag (or tap) words from the bank onto the blanks on a diagram, against the clock.
 * Each topic is a ladder of stages, and every stage brings new parts to label.
 */
export function LabelLab() {
  const age = useQuiz((s) => s.age);
  const park = useQuiz((s) => s.park);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const [level, setLevel] = useState<ArcadeLevel>(() => loadLevel("label", age));
  const cfg = LABEL_LEVELS[level];
  const best = useQuiz((s) => s.arcadeBest[`label-${level}`] ?? 0);

  const [choice, setChoice] = useState("mixed");
  // unlocked starting stages, read once the page is in the browser
  const [reached, setReached] = useState<Record<string, number>>({});
  const [startStage, setStartStage] = useState(1);
  const [phase, setPhase] = useState<Phase>("pick");
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
  const [reveal, setReveal] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const refreshReached = useCallback(() => {
    setReached(Object.fromEntries(LABEL_TOPICS.map((t) => [t.id, loadReached(t.id)])));
  }, []);
  useEffect(() => refreshReached(), [refreshReached]);

  const pickTopic = (id: string) => {
    setChoice(id);
    setStartStage(id === "mixed" ? 1 : (reached[id] ?? 1));
  };

  const startRound = useCallback(
    (topicId: string, stageNo: number) => {
      const topic = topicById(topicId);
      if (!topic) return;
      const r = buildRound(topic, stageNo, LABEL_LEVELS[level]);
      const seconds = labelSeconds(LABEL_LEVELS[level], stageNo, r.targets.length);
      setGame(r);
      setPlaced(new Set());
      setBank(r.bank);
      setSelected(null);
      setTotal(seconds * 1000);
      setTimeLeft(seconds * 1000);
      setMistakes(0);
      setHintSlot(null);
      setWrongSlot(null);
      setReveal(false);
      setPhase("play");
    },
    [level],
  );

  const startGame = (stageNo = startStage) => {
    setStreak(0);
    setBestStreak(0);
    setLabelled(0);
    setCoins(0);
    const plan = nextPlan(choice, choice === "mixed" ? 1 : stageNo, "");
    if (plan) startRound(plan.topic.id, plan.stageNo);
  };

  // what the next round will be (worked out once a stage is cleared, so the preview matches)
  const [upNext, setUpNext] = useState<{ topicId: string; stageNo: number } | null>(null);

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
          arcadeReward("label", game.stageNo, earned);
          arcadeReward(`label-${level}`, game.stageNo, 0);
          unlockAfter(game.topic.id, game.stageNo);
          refreshReached();
          const plan = nextPlan(choice, game.stageNo + 1, game.topic.id);
          setUpNext(plan ? { topicId: plan.topic.id, stageNo: plan.stageNo } : null);
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
    [game, phase, placed, timeLeft, mistakes, level, choice, cfg.penalty, arcadeReward, refreshReached],
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
  const nextTopic = upNext ? topicById(upNext.topicId) : undefined;
  const nextStage = nextTopic && upNext ? nextTopic.stages[upNext.stageNo - 1] : undefined;
  const chosenTopic = topicById(choice);
  const topics = useMemo(() => [{ id: "mixed", title: "Mix it up", emoji: "🎲", stages: 0 }, ...LABEL_TOPICS.map((t) => ({ id: t.id, title: t.title, emoji: t.emoji, stages: t.stages.length }))], []);

  return (
    <GameStage
      title="Label Lab"
      onBack={() => park("map")}
      stats={
        phase === "pick" ? (
          <span>Best: stage {best || "—"}</span>
        ) : (
          <span>
            {LEVEL_NAMES[level]} · {labelled} labelled
            <span className="block font-bold">{coins} coins</span>
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
              <p className="text-sm text-muted">Drag each word to its blank, or tap a word and then its blank. Every stage brings new parts to learn, and the clock gets faster.</p>
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
              <button key={t.id} type="button" onClick={() => pickTopic(t.id)} className={choice === t.id ? "is-active" : ""} aria-pressed={choice === t.id}>
                <span className="text-2xl" aria-hidden>
                  {t.emoji}
                </span>
                {t.title}
                <small>{t.stages ? `${reached[t.id] ?? 1}/${t.stages} open` : "stage by stage"}</small>
              </button>
            ))}
          </div>
          {chosenTopic ? (
            <>
              <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-gold">Start at</p>
              <div className="lab-stages mt-1" role="radiogroup" aria-label="Starting stage">
                {chosenTopic.stages.map((stage, i) => {
                  const n = i + 1;
                  const open = n <= (reached[chosenTopic.id] ?? 1);
                  return (
                    <button
                      key={stage.title}
                      type="button"
                      role="radio"
                      aria-checked={startStage === n}
                      disabled={!open}
                      onClick={() => setStartStage(n)}
                      className={startStage === n ? "is-active" : ""}
                      title={open ? stage.title : "Clear the stage before to open this one"}
                    >
                      <b>{open ? n : <Lock className="size-3.5" aria-label="Locked" />}</b>
                      <span>{stage.title}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
          <button type="button" onClick={() => startGame()} className="mt-4 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-lg font-extrabold text-primary-fg">
            <Play className="size-5" aria-hidden /> {chosenTopic && startStage > 1 ? `Start at stage ${startStage}` : "Start labelling"}
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
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold leading-tight">
                {game.topic.emoji} {game.stage.title}
              </p>
              <p className="text-xs font-extrabold text-muted">
                {game.topic.title} · stage {game.stageNo} of {game.topic.stages.length}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {streak >= 3 ? (
                <span className="lab-streak">
                  <Flame className="size-4" aria-hidden /> {streak}
                </span>
              ) : null}
              <button type="button" onClick={hint} disabled={phase !== "play"} className="lab-hint" aria-label={`Hint, costs ${HINT_COST} seconds`}>
                <Lightbulb className="size-4" aria-hidden /> −{HINT_COST}s
              </button>
            </div>
          </div>

          <div className="lab-board">
            <svg viewBox={`0 0 ${BOX} ${BOX}`} className="lab-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Diagram: ${game.stage.title}`}>
              <g dangerouslySetInnerHTML={{ __html: game.stage.art }} />
              {game.targets.map((t, i) => {
                const [ax, ay] = t.part.at;
                const s = t.slot;
                const done = placed.has(i);
                const missed = !done && reveal;
                const ready = !done && phase === "play" && (selected !== null || hoverSlot === i);
                return (
                  <g key={t.part.word}>
                    <line x1={s.lx} y1={s.ly} x2={ax} y2={ay} className={done ? "lab-line is-done" : missed ? "lab-line is-missed" : "lab-line"} />
                    <circle cx={ax} cy={ay} r={5} className={`lab-dot ${done ? "is-done" : missed ? "is-missed" : cfg.pulse ? "is-pulse" : ""}`} />
                    <g
                      data-slot={i}
                      className={`lab-slot ${done ? "is-done" : ""} ${missed ? "is-missed" : ""} ${ready ? "is-ready" : ""} ${hoverSlot === i ? "is-hover" : ""} ${wrongSlot === i ? "is-wrong" : ""} ${hintSlot === i ? "is-hint" : ""}`}
                      onClick={() => selected && tryPlace(selected, i)}
                      role="button"
                      aria-label={done || missed ? t.word : "Empty label"}
                    >
                      <rect x={s.x - s.w / 2} y={s.y - s.h / 2} width={s.w} height={s.h} rx={10} />
                      <text x={s.x} y={s.y + 1} textAnchor="middle" dominantBaseline="central" style={{ fontSize: s.font }}>
                        {done || missed ? t.word : "?"}
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
                <p className="font-display text-2xl font-semibold">{nextStage ? `Stage ${game.stageNo} done!` : `${game.topic.title}: all done!`}</p>
                <p className="text-sm text-muted">
                  {Math.ceil(timeLeft / 1000)}s to spare{mistakes === 0 ? " · perfect, +3 bonus coins" : ""}
                  {bestStreak >= 3 ? ` · best streak ${bestStreak}` : ""}
                </p>
                <p className="lab-fact">
                  <b>Did you know?</b> {game.stage.fact}
                </p>
                {nextStage && nextTopic && upNext ? (
                  <>
                    <p className="mt-2 text-sm font-bold">
                      Next: {nextTopic.emoji} {nextStage.title} · {labelsFor(cfg, upNext.stageNo, nextStage.parts.length)} new labels, quicker clock
                    </p>
                    <button type="button" onClick={() => startRound(upNext.topicId, upNext.stageNo)} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 font-extrabold text-primary-fg">
                      Stage {upNext.stageNo} <ArrowRight className="size-4" aria-hidden />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold">
                      <Trophy className="size-4 text-gold" aria-hidden /> You labelled every stage{choice === "mixed" ? " in the mix" : ""}!
                    </p>
                    <button type="button" onClick={() => setPhase("pick")} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-6 font-extrabold text-primary-fg">
                      Pick another topic <ArrowRight className="size-4" aria-hidden />
                    </button>
                  </>
                )}
              </div>
            ) : null}
            {phase === "over" && !reveal ? (
              <div className="lab-overlay" role="status">
                <p className="font-display text-3xl font-semibold">Time's up!</p>
                <p className="text-sm text-muted">
                  You got to stage {game.stageNo} and labelled {labelled} {labelled === 1 ? "part" : "parts"}. {coins} coins earned.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => setReveal(true)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-4 font-extrabold">
                    <Eye className="size-4" aria-hidden /> See the answers
                  </button>
                  <button type="button" onClick={() => startRound(game.topic.id, game.stageNo)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-5 font-extrabold text-primary-fg">
                    <RotateCcw className="size-4" aria-hidden /> Try stage {game.stageNo} again
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {phase === "over" && reveal ? (
            <div className="lab-bank">
              <p className="w-full text-center text-xs font-bold text-muted">The ones in orange are the answers you missed.</p>
              <button type="button" onClick={() => startRound(game.topic.id, game.stageNo)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-5 font-extrabold text-primary-fg">
                <RotateCcw className="size-4" aria-hidden /> Try stage {game.stageNo} again
              </button>
              <button type="button" onClick={() => setPhase("pick")} className="inline-flex min-h-11 items-center rounded-2xl border border-line bg-surface px-4 font-extrabold">
                Change topic
              </button>
            </div>
          ) : (
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
          )}

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
