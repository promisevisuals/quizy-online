import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, Volume2 } from "lucide-react";
import { playTone, speak } from "@/lib/quiz/logic";
import {
  GRID,
  OPPOSITE,
  decoyCount,
  judge,
  layTiles,
  oopsMessage,
  same,
  spawnSnake,
  step,
  tickMs,
  wordFor,
  type Cell,
  type Dir,
  type SnakeWord,
  type Tile,
} from "@/lib/quiz/snake";
import { useQuiz } from "@/lib/quiz/store";

type Phase = "ready" | "playing" | "oops" | "word" | "over";

type Game = {
  word: SnakeWord;
  progress: number;
  snake: Cell[];
  dir: Dir;
  queue: Dir[];
  tiles: Tile[];
  grow: number;
  lives: number;
  wordsDone: number;
  coins: number;
  flash: { cell: Cell; good: boolean; at: number } | null;
};

const START_LIVES = 3;

function newWordState(age: "young" | "old", wordsDone: number): Pick<Game, "word" | "progress" | "snake" | "dir" | "queue" | "tiles" | "grow"> {
  const word = wordFor(age, wordsDone);
  const snake = spawnSnake();
  return {
    word,
    progress: 0,
    snake,
    dir: "right",
    queue: [],
    tiles: layTiles(word.word, decoyCount(wordsDone), snake),
    grow: 0,
  };
}

function freshGame(age: "young" | "old"): Game {
  return { ...newWordState(age, 0), lives: START_LIVES, wordsDone: 0, coins: 0, flash: null };
}

export function WordSnake() {
  const age = useQuiz((s) => s.age);
  const best = useQuiz((s) => s.arcadeBest.snake ?? 0);
  const voiceOn = useQuiz((s) => s.voiceOn);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const park = useQuiz((s) => s.park);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const game = useRef<Game>(freshGame(age));
  const phaseRef = useRef<Phase>("ready");
  const [phase, setPhaseState] = useState<Phase>("ready");
  const [message, setMessage] = useState("");
  // mirror of the bits of game state the DOM shows
  const [hud, setHud] = useState({ word: game.current.word, progress: 0, lives: START_LIVES, wordsDone: 0, coins: 0 });

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const syncHud = useCallback(() => {
    const g = game.current;
    setHud({ word: g.word, progress: g.progress, lives: g.lives, wordsDone: g.wordsDone, coins: g.coins });
  }, []);

  const say = useCallback(
    (text: string) => {
      if (voiceOn) speak(text);
    },
    [voiceOn],
  );

  /* ---------- drawing ---------- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const cell = size / GRID;
    const g = game.current;
    ctx.clearRect(0, 0, size, size);

    // board: soft checker grass
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#f3f9e7" : "#e8f3d6";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    // letter tiles
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of g.tiles) {
      const px = t.x * cell;
      const py = t.y * cell;
      const pad = cell * 0.08;
      ctx.fillStyle = "rgba(120, 84, 20, 0.18)";
      roundRect(ctx, px + pad, py + pad + cell * 0.06, cell - pad * 2, cell - pad * 2, cell * 0.22);
      ctx.fill();
      ctx.fillStyle = "#fff8ea";
      ctx.strokeStyle = "#d4920b";
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      roundRect(ctx, px + pad, py + pad, cell - pad * 2, cell - pad * 2, cell * 0.22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a2416";
      ctx.font = `800 ${Math.round(cell * 0.58)}px "Baloo 2", Nunito, system-ui, sans-serif`;
      ctx.fillText(t.letter, px + cell / 2, py + cell / 2 + cell * 0.04);
    }

    // flash ring where something was eaten
    if (g.flash && performance.now() - g.flash.at < 420) {
      const k = (performance.now() - g.flash.at) / 420;
      ctx.strokeStyle = g.flash.good ? `rgba(27,122,69,${1 - k})` : `rgba(193,61,61,${1 - k})`;
      ctx.lineWidth = cell * 0.12;
      ctx.beginPath();
      ctx.arc(g.flash.cell.x * cell + cell / 2, g.flash.cell.y * cell + cell / 2, cell * (0.4 + k * 0.6), 0, Math.PI * 2);
      ctx.stroke();
    }

    // snake body, tail first so the head sits on top
    for (let i = g.snake.length - 1; i >= 0; i--) {
      const c = g.snake[i];
      if (!c) continue;
      const t = i / Math.max(1, g.snake.length - 1);
      const inset = cell * (i === 0 ? 0.04 : 0.1 + t * 0.06);
      ctx.fillStyle = i === 0 ? "#1c7a4a" : i % 2 === 0 ? "#2f9a5f" : "#3aa86b";
      roundRect(ctx, c.x * cell + inset, c.y * cell + inset, cell - inset * 2, cell - inset * 2, cell * 0.36);
      ctx.fill();
    }

    // head: eyes look where the snake is going
    const head = g.snake[0];
    if (head) {
      const cx = head.x * cell + cell / 2;
      const cy = head.y * cell + cell / 2;
      const look = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[g.dir];
      const side = [look[1], look[0]];
      for (const s of [-1, 1]) {
        const ex = cx + look[0] * cell * 0.14 + side[0] * s * cell * 0.17;
        const ey = cy + look[1] * cell * 0.14 + side[1] * s * cell * 0.17;
        ctx.fillStyle = "#fffaf1";
        ctx.beginPath();
        ctx.arc(ex, ey, cell * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2a2416";
        ctx.beginPath();
        ctx.arc(ex + look[0] * cell * 0.04, ey + look[1] * cell * 0.04, cell * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  /* ---------- rules ---------- */
  const loseLife = useCallback(
    (text: string) => {
      const g = game.current;
      g.lives -= 1;
      playTone(false);
      syncHud();
      if (g.lives <= 0) {
        setMessage(text);
        setPhase("over");
        return;
      }
      setMessage(text);
      setPhase("oops");
    },
    [setPhase, syncHud],
  );

  const tick = useCallback(() => {
    const g = game.current;
    const queued = g.queue.shift();
    if (queued && queued !== OPPOSITE[g.dir]) g.dir = queued;
    const head = g.snake[0];
    if (!head) return;
    const next = step(head, g.dir);
    const bite = judge(next, g.snake, g.tiles, g.word.word, g.progress);

    if (bite.kind === "self" || bite.kind === "wrong") {
      g.flash = { cell: next, good: false, at: performance.now() };
      loseLife(oopsMessage(bite, g.word.word));
      return;
    }

    g.snake.unshift(next);
    if (bite.kind === "good") {
      g.tiles = g.tiles.filter((t) => t.id !== bite.tile.id);
      g.progress += 1;
      g.grow += 1;
      g.flash = { cell: next, good: true, at: performance.now() };
      playTone(true);
      if (bite.done) {
        g.wordsDone += 1;
        g.coins += g.word.word.length;
        arcadeReward("snake", g.wordsDone, g.word.word.length);
        setMessage(`${g.word.emoji} ${g.word.word}! +${g.word.word.length} coins`);
        say(`Well done! ${g.word.word.toLowerCase()}`);
        setPhase("word");
      }
      syncHud();
    }
    if (g.grow > 0) g.grow -= 1;
    else g.snake.pop();
  }, [arcadeReward, loseLife, say, setPhase, syncHud]);

  /* ---------- loop ---------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(250, now - last);
      last = now;
      if (phaseRef.current === "playing") {
        acc += dt;
        const ms = tickMs(age, game.current.wordsDone);
        while (acc >= ms && phaseRef.current === "playing") {
          acc -= ms;
          tick();
        }
      } else {
        acc = 0;
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [age, draw, tick]);

  // after a finished word, roll on to the next one
  useEffect(() => {
    if (phase !== "word") return;
    const id = window.setTimeout(() => {
      const g = game.current;
      Object.assign(g, newWordState(age, g.wordsDone));
      syncHud();
      setMessage("");
      setPhase("ready");
      say(g.word.word.toLowerCase());
    }, 1500);
    return () => window.clearTimeout(id);
  }, [age, phase, say, setPhase, syncHud]);

  /* ---------- canvas sizing ---------- */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const css = Math.floor(Math.min(wrap.clientWidth, 520));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${css}px`;
      canvas.style.height = `${css}px`;
      canvas.width = Math.floor(css * dpr);
      canvas.height = Math.floor(css * dpr);
      draw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  /* ---------- input ---------- */
  const steer = useCallback(
    (dir: Dir) => {
      const g = game.current;
      const p = phaseRef.current;
      if (p === "over" || p === "word") return;
      if (p === "ready" || p === "oops") {
        if (p === "oops") {
          // respawn, keeping the letters already collected
          g.snake = spawnSnake();
          g.grow = Math.max(0, g.progress);
          g.tiles = g.tiles.map((t) => (g.snake.some((c) => same(c, t)) ? { ...t, x: (t.x + 5) % GRID } : t));
          g.dir = "right";
          setMessage("");
        }
        g.queue = [];
        if (dir !== "left") g.dir = dir;
        setPhase("playing");
        return;
      }
      const lastDir = g.queue[g.queue.length - 1] ?? g.dir;
      if (dir === lastDir || dir === OPPOSITE[lastDir]) return;
      if (g.queue.length < 2) g.queue.push(dir);
    },
    [setPhase],
  );

  useEffect(() => {
    const keys: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      W: "up",
      S: "down",
      A: "left",
      D: "right",
    };
    const onKey = (event: KeyboardEvent) => {
      const dir = keys[event.key];
      if (dir) {
        event.preventDefault();
        steer(dir);
      } else if ((event.key === " " || event.key === "Enter") && phaseRef.current !== "playing" && phaseRef.current !== "over") {
        event.preventDefault();
        steer("right");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steer]);

  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (event: React.PointerEvent) => {
    swipe.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const start = swipe.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    swipe.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = () => {
    if (swipe.current && phaseRef.current !== "playing" && phaseRef.current !== "over") steer("right");
    swipe.current = null;
  };

  const restart = () => {
    game.current = freshGame(age);
    syncHud();
    setMessage("");
    setPhase("ready");
    say(game.current.word.word.toLowerCase());
  };

  const { word, progress, lives, wordsDone, coins } = hud;
  const needed = word.word[progress] ?? "";

  return (
    <section className="mx-auto max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => park("map")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 font-extrabold">
          <ArrowLeft className="size-4" aria-hidden /> Trail
        </button>
        <div className="flex items-center gap-1" aria-label={`${lives} lives left`}>
          {Array.from({ length: START_LIVES }, (_, i) => (
            <Heart key={i} className={i < lives ? "size-6 fill-bad text-bad" : "size-6 text-line"} aria-hidden />
          ))}
        </div>
        <p className="text-sm font-extrabold text-muted">
          Words {wordsDone} · Best {Math.max(best, wordsDone)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden>
            {word.emoji}
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-gold">Eat the letters in order</p>
            <p className="snake-word font-display text-3xl font-semibold tracking-[0.18em]" aria-label={`Word: ${word.word}. Next letter ${needed}`}>
              {word.word.split("").map((letter, i) => (
                <span key={i} className={i < progress ? "is-eaten" : i === progress ? "is-next" : ""}>
                  {letter}
                </span>
              ))}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => speak(`${word.word.toLowerCase()}. ${word.hint}`)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-line"
          aria-label="Hear the word"
        >
          <Volume2 className="size-5 text-gold" aria-hidden />
        </button>
      </div>

      <div ref={wrapRef} className="relative mt-3 w-full">
        <canvas
          ref={canvasRef}
          className="snake-board mx-auto block rounded-card"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
          aria-label="Word Snake board. Use arrow keys, swipe, or the buttons below."
        />
        {phase !== "playing" && (
          <div className="snake-overlay" role="status">
            {phase === "ready" && (
              <>
                <p className="font-display text-2xl font-semibold">
                  {word.emoji} Spell {word.word}
                </p>
                <p className="mt-1 text-sm text-muted">{word.hint}</p>
                <p className="mt-3 text-sm font-bold">Swipe, use the arrows, or tap Go!</p>
                <button type="button" onClick={() => steer("right")} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                  Go!
                </button>
              </>
            )}
            {phase === "oops" && (
              <>
                <p className="font-display text-2xl font-semibold">Oops! Try again</p>
                <p className="mt-1 max-w-xs text-sm">{message}</p>
                <button type="button" onClick={() => steer("right")} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                  Keep going
                </button>
              </>
            )}
            {phase === "word" && <p className="font-display text-3xl font-semibold text-good">{message}</p>}
            {phase === "over" && (
              <>
                <p className="font-display text-2xl font-semibold">Game over</p>
                <p className="mt-1 max-w-xs text-sm">{message}</p>
                <p className="mt-2 font-extrabold">
                  {wordsDone} {wordsDone === 1 ? "word" : "words"} · {coins} coins earned
                </p>
                <button type="button" onClick={restart} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                  Play again
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="snake-pad mx-auto mt-3" aria-label="Steering buttons">
        <button type="button" className="pad-up" onClick={() => steer("up")} aria-label="Up">
          <ArrowUp aria-hidden />
        </button>
        <button type="button" className="pad-left" onClick={() => steer("left")} aria-label="Left">
          <ArrowLeft aria-hidden />
        </button>
        <button type="button" className="pad-right" onClick={() => steer("right")} aria-label="Right">
          <ArrowRight aria-hidden />
        </button>
        <button type="button" className="pad-down" onClick={() => steer("down")} aria-label="Down">
          <ArrowDown aria-hidden />
        </button>
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        A wrong letter, a letter out of order, or bumping your own tail costs a heart. Every finished word earns coins.
      </p>
    </section>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
