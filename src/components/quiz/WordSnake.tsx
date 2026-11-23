import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Volume2 } from "lucide-react";
import { ARCADE_LEVELS, LEVEL_NAMES, SNAKE_LEVELS, loadLevel, saveLevel, type ArcadeLevel, type SnakeLevel } from "@/lib/quiz/arcade";
import { playTone, speak } from "@/lib/quiz/logic";
import {
  GRID,
  OPPOSITE,
  boardFor,
  decoyCount,
  flashMsFor,
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
import { GameStage } from "@/components/quiz/GameStage";

type Phase = "ready" | "playing" | "oops" | "word" | "over";

type BoardSize = { cols: number; rows: number };

type Game = {
  board: BoardSize;
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

function newWordState(cfg: SnakeLevel, wordsDone: number, last: string, board: BoardSize): Pick<Game, "board" | "word" | "progress" | "snake" | "dir" | "queue" | "tiles" | "grow"> {
  const word = wordFor(cfg, wordsDone, Math.random, last);
  return { ...layoutFor(word, cfg, wordsDone, board), word };
}

/** Snake and letters for a word on a board of this size. */
function layoutFor(word: SnakeWord, cfg: SnakeLevel, wordsDone: number, board: BoardSize) {
  const snake = spawnSnake(board);
  return {
    board,
    progress: 0,
    snake,
    dir: "right" as Dir,
    queue: [],
    tiles: layTiles(word.word, decoyCount(wordsDone, cfg), snake, Math.random, board),
    grow: 0,
  };
}

function freshGame(cfg: SnakeLevel, board: BoardSize): Game {
  return { ...newWordState(cfg, 0, "", board), lives: START_LIVES, wordsDone: 0, coins: 0, flash: null };
}

export function WordSnake() {
  const age = useQuiz((s) => s.age);
  const best = useQuiz((s) => s.arcadeBest.snake ?? 0);
  const voiceOn = useQuiz((s) => s.voiceOn);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const park = useQuiz((s) => s.park);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // a state ref, so sizing starts as soon as the full-screen stage has mounted the board
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const [level, setLevel] = useState<ArcadeLevel>(() => loadLevel("snake", age));
  const cfg = SNAKE_LEVELS[level];
  // the board's shape follows the screen: tall on phones, wide on laptops
  const boardRef = useRef<BoardSize>({ cols: GRID, rows: GRID });
  const game = useRef<Game>(freshGame(SNAKE_LEVELS[level], boardRef.current));
  // Memory levels: the word shows until this time, then hides.
  const [revealUntil, setRevealUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const revealing = cfg.word === "flash" && now < revealUntil;
  const revealingRef = useRef(false);
  revealingRef.current = revealing;
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
    const g = game.current;
    const { cols, rows } = g.board;
    const cell = canvas.width / cols;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // board: soft checker grass
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
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
    const next = step(head, g.dir, g.board);
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
        arcadeReward(`snake-${level}`, g.wordsDone, 0);
        setMessage(`${g.word.emoji} ${g.word.word}! +${g.word.word.length} coins`);
        say(`Well done! ${g.word.word.toLowerCase()}`);
        setPhase("word");
      }
      syncHud();
    }
    if (g.grow > 0) g.grow -= 1;
    else g.snake.pop();
  }, [arcadeReward, level, loseLife, say, setPhase, syncHud]);

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
        const ms = tickMs(cfg, game.current.wordsDone);
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
  }, [cfg, draw, tick]);

  /** A new word is up: say it (where the level allows) and start the memory peek. */
  const beginWord = useCallback(() => {
    const g = game.current;
    if (cfg.canHear) say(g.word.word.toLowerCase());
    const ms = flashMsFor(cfg, g.wordsDone);
    if (ms) {
      const until = Date.now() + ms;
      setNow(Date.now());
      setRevealUntil(until);
    } else setRevealUntil(0);
  }, [cfg, say]);

  // after a finished word, roll on to the next one
  useEffect(() => {
    if (phase !== "word") return;
    const id = window.setTimeout(() => {
      const g = game.current;
      Object.assign(g, newWordState(cfg, g.wordsDone, g.word.word, boardRef.current));
      syncHud();
      setMessage("");
      setPhase("ready");
      fitRef.current();
      beginWord();
    }, 1500);
    return () => window.clearTimeout(id);
  }, [beginWord, cfg, phase, setPhase, syncHud]);

  // count down the memory peek
  useEffect(() => {
    if (!revealUntil) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= revealUntil) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [revealUntil]);

  /* ---------- canvas sizing ---------- */
  const fitRef = useRef<() => void>(() => {});
  useEffect(() => {
    const wrap = wrapEl;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 50 || h < 50) return;
      // The board fills the whole play area. Its shape is picked from the screen,
      // and only changed between words so letters never jump mid-word.
      const want = boardFor(w, h);
      boardRef.current = want;
      const g = game.current;
      const fresh = phaseRef.current === "ready" && g.progress === 0;
      if (fresh && (g.board.cols !== want.cols || g.board.rows !== want.rows)) {
        Object.assign(g, layoutFor(g.word, cfg, g.wordsDone, want));
      }
      const { cols, rows } = g.board;
      const cellPx = Math.max(8, Math.floor(Math.min(w / cols, h / rows)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${cellPx * cols}px`;
      canvas.style.height = `${cellPx * rows}px`;
      canvas.width = Math.floor(cellPx * cols * dpr);
      canvas.height = Math.floor(cellPx * rows * dpr);
      draw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    fitRef.current = fit;
    return () => ro.disconnect();
  }, [cfg, draw, wrapEl]);

  /* ---------- input ---------- */
  const steer = useCallback(
    (dir: Dir) => {
      const g = game.current;
      const p = phaseRef.current;
      if (p === "over" || p === "word") return;
      if (revealingRef.current) return;
      if (p === "ready" || p === "oops") {
        if (p === "oops") {
          // respawn, keeping the letters already collected
          g.snake = spawnSnake(g.board);
          g.grow = Math.max(0, g.progress);
          g.tiles = g.tiles.map((t) => (g.snake.some((c) => same(c, t)) ? { ...t, x: (t.x + 5) % g.board.cols } : t));
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

  const restart = (nextLevel: ArcadeLevel = level) => {
    game.current = freshGame(SNAKE_LEVELS[nextLevel], boardRef.current);
    syncHud();
    setMessage("");
    setPhase("ready");
  };

  // start (or restart) the first word whenever the level changes
  const firstWordFor = useRef<string>("");
  useEffect(() => {
    const key = `${level}:${game.current.word.word}:${game.current.wordsDone}`;
    if (phase === "ready" && hud.wordsDone === 0 && hud.progress === 0 && firstWordFor.current !== key) {
      firstWordFor.current = key;
      beginWord();
    }
  });

  const chooseLevel = (next: ArcadeLevel) => {
    if (next === level) return;
    setLevel(next);
    saveLevel("snake", next);
    restart(next);
  };
  const canChooseLevel = phase === "over" || (phase === "ready" && hud.wordsDone === 0 && hud.progress === 0 && hud.lives === START_LIVES);
  const levelBest = useQuiz((s) => s.arcadeBest[`snake-${level}`] ?? 0);

  const { word, progress, lives, wordsDone, coins } = hud;
  const needed = word.word[progress] ?? "";
  // On memory levels the word is hidden after the peek: only eaten letters show.
  const hidden = cfg.word === "flash" && !revealing;
  const peekLeft = revealing ? Math.max(0, revealUntil - now) : 0;
  const peekTotal = flashMsFor(cfg, wordsDone) || 1;

  const hearButton = cfg.canHear ? (
    <button
      type="button"
      onClick={() => speak(hidden ? word.word.toLowerCase() : `${word.word.toLowerCase()}. ${word.hint}`)}
      className="snake-hear"
      aria-label="Hear the word"
    >
      <Volume2 className="size-5 text-gold" aria-hidden />
    </button>
  ) : null;

  return (
    <GameStage
      title="Word Snake"
      full
      onBack={() => park("map")}
      heading={
        <div className="snake-heading min-w-0">
          <span className="text-2xl leading-none" aria-hidden>
            {cfg.showPicture ? word.emoji : "🧠"}
          </span>
          <p
            className="snake-word font-display font-semibold"
            data-len={word.word.length > 7 ? "long" : "short"}
            aria-label={hidden ? `Word hidden. ${progress} of ${word.word.length} letters eaten` : `Word: ${word.word}. Next letter ${needed}`}
          >
            {word.word.split("").map((letter, i) => (
              <span key={i} className={i < progress ? "is-eaten" : i === progress && cfg.highlightNext ? "is-next" : hidden ? "is-hidden" : ""}>
                {hidden && i >= progress ? "_" : letter}
              </span>
            ))}
          </p>
        </div>
      }
      stats={
        <>
          <span className="flex items-center" aria-label={`${lives} lives left`}>
            {Array.from({ length: START_LIVES }, (_, i) => (
              <Heart key={i} className={i < lives ? "size-[1.15rem] fill-bad text-bad" : "size-[1.15rem] text-line"} aria-hidden />
            ))}
          </span>
          <span className="snake-score" aria-label={`${wordsDone} words spelled`}>
            <b>{wordsDone}</b>
            <small>{wordsDone === 1 ? "word" : "words"}</small>
          </span>
        </>
      }
    >
      <div ref={setWrapEl} className="snake-wrap">
        <canvas
          ref={canvasRef}
          className="snake-board block"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
          aria-label="Word Snake board. Swipe on the board, or use the arrow keys."
        />
        {phase !== "playing" && (
          <div className="snake-overlay" role="status">
            <div className="snake-card">
            {phase === "ready" && revealing && (
              <>
                <p className="text-xs font-extrabold uppercase tracking-widest text-gold">Remember it!</p>
                <p className="font-display text-4xl font-semibold tracking-[0.15em]">{word.word}</p>
                <span className="peek-bar mx-auto mt-2 w-40" aria-hidden>
                  <span style={{ width: `${(peekLeft / peekTotal) * 100}%` }} />
                </span>
                <p className="mt-2 text-sm text-muted">It hides in {Math.ceil(peekLeft / 1000)}…</p>
              </>
            )}
            {phase === "ready" && !revealing && (
              <>
                {canChooseLevel ? (
                  <div className="mb-3 w-full">
                    <div className="arcade-levels" role="radiogroup" aria-label="Difficulty">
                      {ARCADE_LEVELS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          role="radio"
                          aria-checked={item === level}
                          onClick={() => chooseLevel(item)}
                          className={item === level ? "is-active" : ""}
                        >
                          {LEVEL_NAMES[item]}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs font-bold text-muted">
                      {cfg.blurb}. Best {Math.max(levelBest, wordsDone)}
                      {best > levelBest ? ` · all levels ${best}` : ""}
                    </p>
                  </div>
                ) : null}
                <p className="font-display text-2xl font-semibold">
                  {hidden ? "Now spell it from memory" : `${word.emoji} Spell ${word.word}`}
                </p>
                {cfg.showPicture ? <p className="mt-1 text-sm text-muted">{word.hint}</p> : null}
                <p className="mt-2 text-sm font-bold">Swipe on the board to steer · arrow keys on a computer</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {hearButton}
                  <button type="button" onClick={() => steer("right")} className="min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                    Go!
                  </button>
                </div>
              </>
            )}
            {phase === "oops" && (
              <>
                <p className="font-display text-2xl font-semibold">Oops! Try again</p>
                <p className="mt-1 max-w-xs text-sm">{message}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {hearButton}
                  <button type="button" onClick={() => steer("right")} className="min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                    Keep going
                  </button>
                </div>
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
                <p className="text-xs font-bold text-muted">
                  {LEVEL_NAMES[level]} best: {Math.max(levelBest, wordsDone)}
                </p>
                <div className="mt-3 w-full">
                  <div className="arcade-levels" role="radiogroup" aria-label="Difficulty">
                    {ARCADE_LEVELS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="radio"
                        aria-checked={item === level}
                        onClick={() => chooseLevel(item)}
                        className={item === level ? "is-active" : ""}
                      >
                        {LEVEL_NAMES[item]}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => restart()} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                  Play again
                </button>
              </>
            )}
            </div>
          </div>
        )}
      </div>
    </GameStage>
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
