import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ChevronLeft, ChevronRight, Pause, Play as PlayIcon, RotateCcw, RotateCw } from "lucide-react";
import { LEVEL_NAMES, loadLevel, saveLevel, type ArcadeLevel } from "@/lib/quiz/arcade";
import {
  BRICK_COLORS,
  COLS,
  HIDDEN,
  ROWS,
  cellsOf,
  ghostY,
  hardDrop,
  hold,
  move,
  newGame,
  previewCells,
  rotate,
  softDrop,
  tick,
  type Game,
  type Kind,
} from "@/lib/quiz/bricks";
import { sfx } from "@/lib/quiz/sfx";
import { useQuiz } from "@/lib/quiz/store";
import { GameStage } from "@/components/quiz/GameStage";
import { LevelChoice, NoTickets, TicketCount, TicketHint, useTicket } from "@/components/quiz/FunGameKit";

const START: Record<ArcadeLevel, { level: number; ghost: boolean; blurb: string }> = {
  easy: { level: 1, ghost: true, blurb: "Slow bricks and a shadow that shows where they land" },
  medium: { level: 4, ghost: true, blurb: "Starts faster" },
  hard: { level: 7, ghost: true, blurb: "Quick from the first brick" },
  expert: { level: 10, ghost: false, blurb: "Very fast and no landing shadow" },
};

type Phase = "ready" | "playing" | "paused" | "over";
type Hud = { score: number; lines: number; level: number };

const PANEL = 5.4; // side panel width in cells

export function Bricks() {
  const age = useQuiz((s) => s.age);
  const park = useQuiz((s) => s.park);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const [level, setLevel] = useState<ArcadeLevel>(() => loadLevel("bricks", age));
  const best = useQuiz((s) => s.arcadeBest[`bricks-${level}`] ?? 0);
  const ticket = useTicket();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const gameRef = useRef<Game>(newGame(START[level].level));
  const phaseRef = useRef<Phase>("ready");
  const [phase, setPhaseState] = useState<Phase>("ready");
  const [hud, setHud] = useState<Hud>({ score: 0, lines: 0, level: START[level].level });
  const [result, setResult] = useState<{ coins: number; newBest: boolean } | null>(null);
  const [noTicket, setNoTicket] = useState(false);
  const flashRef = useRef<{ until: number; count: number }>({ until: 0, count: 0 });
  const sizeRef = useRef({ cell: 24, w: 0, h: 0, ox: 0, oy: 0 });
  const levelRef = useRef(level);
  levelRef.current = level;

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const syncHud = useCallback(() => {
    const g = gameRef.current;
    setHud((h) => (h.score === g.score && h.lines === g.lines && h.level === g.level ? h : { score: g.score, lines: g.lines, level: g.level }));
  }, []);

  const finish = useCallback(() => {
    const g = gameRef.current;
    const coins = g.lines * 2 + Math.floor(g.score / 1000);
    const lv = levelRef.current;
    const prevBest = useQuiz.getState().arcadeBest[`bricks-${lv}`] ?? 0;
    arcadeReward(`bricks-${lv}`, g.lines, 0);
    arcadeReward("bricks", g.lines, coins);
    setResult({ coins, newBest: g.lines > prevBest });
    sfx.gameOver();
    setPhase("over");
  }, [arcadeReward, setPhase]);

  const start = useCallback(() => {
    if (!ticket.spend()) {
      setNoTicket(true);
      return;
    }
    setNoTicket(false);
    gameRef.current = newGame(START[levelRef.current].level);
    setResult(null);
    syncHud();
    sfx.start();
    setPhase("playing");
  }, [setPhase, syncHud, ticket]);

  /* ---------- actions ---------- */
  const afterLock = useCallback(
    (prevLevel: number) => {
      const g = gameRef.current;
      if (g.lastClear.length) {
        flashRef.current = { until: performance.now() + 220, count: g.lastClear.length };
        sfx.clear(g.lastClear.length);
        if (g.level > prevLevel) window.setTimeout(() => sfx.levelUp(), 250);
      } else {
        sfx.thud();
      }
      syncHud();
      if (g.over) finish();
    },
    [finish, syncHud],
  );

  const act = useCallback(
    (what: "left" | "right" | "cw" | "ccw" | "soft" | "drop" | "hold") => {
      const g = gameRef.current;
      if (phaseRef.current !== "playing" || g.over) return;
      const lv = g.level;
      if (what === "left" && move(g, -1)) sfx.move();
      if (what === "right" && move(g, 1)) sfx.move();
      if (what === "cw" && rotate(g, 1)) sfx.turn();
      if (what === "ccw" && rotate(g, -1)) sfx.turn();
      if (what === "soft") softDrop(g);
      if (what === "hold" && hold(g)) sfx.tick();
      if (what === "drop") {
        hardDrop(g);
        afterLock(lv);
      }
      syncHud();
    },
    [afterLock, syncHud],
  );

  /* ---------- sizing ---------- */
  useEffect(() => {
    const wrap = wrapEl;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      const cell = Math.max(10, Math.floor(Math.min(H / ROWS, W / (COLS + PANEL))));
      const w = Math.round(cell * (COLS + PANEL));
      const h = cell * ROWS;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { cell, w, h, ox: 0, oy: 0 };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [wrapEl]);

  /* ---------- loop ---------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const g = gameRef.current;
      if (phaseRef.current === "playing" && !g.over) {
        const lv = g.level;
        const r = tick(g, dt);
        if (r === "lock") afterLock(lv);
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afterLock]);

  function draw(now: number) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { cell, w, h } = sizeRef.current;
    const g = gameRef.current;
    const bw = cell * COLS;
    ctx.clearRect(0, 0, w, h);
    // board
    ctx.fillStyle = "#1d2a3a";
    ctx.fillRect(0, 0, bw, h);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, h);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(bw, y * cell + 0.5);
      ctx.stroke();
    }
    for (let y = HIDDEN; y < HIDDEN + ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const k = g.board[y]![x];
        if (k) block(ctx, x * cell, (y - HIDDEN) * cell, cell, BRICK_COLORS[k]);
      }
    }
    if (g.piece && !g.over && phaseRef.current !== "ready") {
      if (START[levelRef.current].ghost) {
        const gy = ghostY(g);
        for (const [x, y] of cellsOf({ ...g.piece, y: gy })) {
          if (y < HIDDEN) continue;
          ctx.strokeStyle = BRICK_COLORS[g.piece.kind];
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 2;
          ctx.strokeRect(x * cell + 2, (y - HIDDEN) * cell + 2, cell - 4, cell - 4);
          ctx.globalAlpha = 1;
        }
      }
      for (const [x, y] of cellsOf(g.piece)) {
        if (y < HIDDEN) continue;
        block(ctx, x * cell, (y - HIDDEN) * cell, cell, BRICK_COLORS[g.piece.kind]);
      }
    }
    // line-clear flash
    const f = flashRef.current;
    if (now < f.until) {
      ctx.fillStyle = `rgba(255,255,255,${((f.until - now) / 220) * 0.55})`;
      ctx.fillRect(0, 0, bw, h);
    }
    // side panel
    const px = bw + cell * 0.4;
    const pw = cell * (PANEL - 0.4);
    ctx.fillStyle = "#fff8ea";
    roundRect(ctx, px, 0, pw, h, cell * 0.4);
    ctx.fill();
    ctx.fillStyle = "#6d5c43";
    ctx.font = `800 ${Math.round(cell * 0.45)}px Nunito, system-ui, sans-serif`;
    ctx.textAlign = "center";
    const cx = px + pw / 2;
    ctx.fillText("HOLD", cx, cell * 0.75);
    if (g.hold) mini(ctx, g.hold, cx, cell * 1.9, cell * 0.7, g.canHold ? 1 : 0.35);
    ctx.fillStyle = "#6d5c43";
    ctx.fillText("NEXT", cx, cell * 3.6);
    g.queue.slice(0, 3).forEach((k, i) => mini(ctx, k, cx, cell * (4.8 + i * 2.1), cell * (i === 0 ? 0.7 : 0.55), 1));
    const rows: [string, string][] = [
      ["SCORE", String(g.score)],
      ["LINES", String(g.lines)],
      ["LEVEL", String(g.level)],
    ];
    rows.forEach(([label, value], i) => {
      const y = cell * (11.6 + i * 2.6);
      ctx.fillStyle = "#6d5c43";
      ctx.font = `800 ${Math.round(cell * 0.42)}px Nunito, system-ui, sans-serif`;
      ctx.fillText(label, cx, y);
      ctx.fillStyle = "#2a2416";
      ctx.font = `800 ${Math.round(cell * (value.length > 6 ? 0.62 : 0.8))}px Nunito, system-ui, sans-serif`;
      ctx.fillText(value, cx, y + cell * 0.95);
    });
  }

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Parameters<typeof act>[0]> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowDown: "soft",
        ArrowUp: "cw",
        x: "cw",
        X: "cw",
        z: "ccw",
        Z: "ccw",
        " ": "drop",
        c: "hold",
        C: "hold",
        Shift: "hold",
      };
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        if (phaseRef.current === "playing") setPhase("paused");
        else if (phaseRef.current === "paused") setPhase("playing");
        return;
      }
      const what = map[e.key];
      if (what && phaseRef.current === "playing") {
        e.preventDefault();
        act(what);
      } else if ((e.key === "Enter" || e.key === " ") && (phaseRef.current === "ready" || phaseRef.current === "over")) {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, setPhase, start]);

  // pause when the tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === "playing") setPhase("paused");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [setPhase]);

  /* ---------- touch: drag to move, tap to turn, flick down to drop ---------- */
  const touch = useRef<{ x: number; y: number; ax: number; ay: number; t: number; moved: boolean; id: number } | null>(null);
  function onPointerDown(e: React.PointerEvent) {
    if (phaseRef.current !== "playing") return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    touch.current = { x: e.clientX, y: e.clientY, ax: e.clientX, ay: e.clientY, t: performance.now(), moved: false, id: e.pointerId };
  }
  function onPointerMove(e: React.PointerEvent) {
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    const step = sizeRef.current.cell * 0.85;
    while (e.clientX - t.ax >= step) {
      act("right");
      t.ax += step;
      t.moved = true;
    }
    while (t.ax - e.clientX >= step) {
      act("left");
      t.ax -= step;
      t.moved = true;
    }
    while (e.clientY - t.ay >= step) {
      act("soft");
      t.ay += step;
      t.moved = true;
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    const t = touch.current;
    touch.current = null;
    if (!t || t.id !== e.pointerId) return;
    const dt = performance.now() - t.t;
    const dy = e.clientY - t.y;
    const dx = e.clientX - t.x;
    if (dy > sizeRef.current.cell * 2 && dt < 260 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      act("drop");
      return;
    }
    if (!t.moved && dt < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) act("cw");
  }

  function chooseLevel(l: ArcadeLevel) {
    setLevel(l);
    saveLevel("bricks", l);
    gameRef.current = newGame(START[l].level);
    syncHud();
  }

  // buttons repeat while held, like keys
  const holdTimer = useRef<number | null>(null);
  function pressStart(what: Parameters<typeof act>[0], repeat: boolean) {
    act(what);
    if (!repeat) return;
    let delay = 170;
    const again = () => {
      act(what);
      delay = 55;
      holdTimer.current = window.setTimeout(again, delay);
    };
    holdTimer.current = window.setTimeout(again, delay);
  }
  function pressEnd() {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  const buttons: { what: Parameters<typeof act>[0]; label: string; icon: React.ReactNode; repeat: boolean }[] = [
    { what: "left", label: "Move left", icon: <ChevronLeft className="size-6" aria-hidden />, repeat: true },
    { what: "ccw", label: "Turn left", icon: <RotateCcw className="size-5" aria-hidden />, repeat: false },
    { what: "hold", label: "Hold", icon: <span className="text-xs font-extrabold">HOLD</span>, repeat: false },
    { what: "cw", label: "Turn right", icon: <RotateCw className="size-5" aria-hidden />, repeat: false },
    { what: "drop", label: "Drop", icon: <ArrowDownToLine className="size-5" aria-hidden />, repeat: false },
    { what: "right", label: "Move right", icon: <ChevronRight className="size-6" aria-hidden />, repeat: true },
  ];

  return (
    <GameStage
      title="Brick Drop"
      onBack={() => park("map")}
      stats={
        <>
          <TicketCount />
          {phase === "playing" || phase === "paused" ? (
            <button
              type="button"
              className="game-icon-btn"
              aria-label={phase === "paused" ? "Resume" : "Pause"}
              onClick={() => setPhase(phase === "paused" ? "playing" : "paused")}
            >
              {phase === "paused" ? <PlayIcon className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            </button>
          ) : null}
        </>
      }
    >
      <div ref={setWrapEl} className="bricks-wrap">
        <canvas
          ref={canvasRef}
          className="bricks-board"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (touch.current = null)}
          aria-label="Brick Drop board. Drag to move, tap to turn, flick down to drop. Arrow keys and space on a computer."
        />
        {phase !== "playing" && (
          <div className="snake-overlay" role="status">
            <div className="snake-card">
              {phase === "paused" && (
                <>
                  <p className="font-display text-2xl font-semibold">Paused</p>
                  <button type="button" onClick={() => setPhase("playing")} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                    Keep going
                  </button>
                </>
              )}
              {(phase === "ready" || phase === "over") && (
                <>
                  {phase === "over" ? (
                    <>
                      <p className="font-display text-2xl font-semibold">{result?.newBest ? "New best! 🎉" : "Game over"}</p>
                      <p className="mt-1 font-extrabold">
                        {hud.lines} {hud.lines === 1 ? "line" : "lines"} · {hud.score} points · {result?.coins ?? 0} coins
                      </p>
                      <p className="text-xs font-bold text-muted">
                        {LEVEL_NAMES[level]} best: {Math.max(best, hud.lines)} lines
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-2xl font-semibold">Brick Drop</p>
                      <p className="mt-1 text-sm">Fill a whole row with bricks to clear it. Don't let them reach the top!</p>
                      <p className="mt-1 text-xs font-bold text-muted">Drag to move · tap to turn · flick down to drop · or use the buttons</p>
                    </>
                  )}
                  <div className="mt-3">
                    <LevelChoice level={level} onChange={chooseLevel} blurb={`${START[level].blurb}. Best ${best} lines`} />
                  </div>
                  {noTicket ? (
                    <NoTickets />
                  ) : (
                    <>
                      <button type="button" onClick={start} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                        {phase === "over" ? "Play again" : "Start"}
                      </button>
                      <TicketHint />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="bricks-pad" aria-label="Brick controls">
        {buttons.map((b) => (
          <button
            key={b.what}
            type="button"
            aria-label={b.label}
            onPointerDown={(e) => {
              e.preventDefault();
              pressStart(b.what, b.repeat);
            }}
            onPointerUp={pressEnd}
            onPointerLeave={pressEnd}
            onPointerCancel={pressEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            {b.icon}
          </button>
        ))}
      </div>
    </GameStage>
  );
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  const p = Math.max(1, s * 0.06);
  ctx.fillStyle = color;
  roundRect(ctx, x + p, y + p, s - 2 * p, s - 2 * p, s * 0.18);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  roundRect(ctx, x + p * 2.2, y + p * 2.2, s - 4.4 * p, s * 0.26, s * 0.1);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(x + p * 2, y + s - p * 2 - s * 0.12, s - 4 * p, s * 0.12);
}

function mini(ctx: CanvasRenderingContext2D, kind: Kind, cx: number, cy: number, s: number, alpha: number) {
  const cells = previewCells(kind);
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const w = (Math.max(...xs) - Math.min(...xs) + 1) * s;
  const h = (Math.max(...ys) - Math.min(...ys) + 1) * s;
  ctx.globalAlpha = alpha;
  for (const [x, y] of cells) block(ctx, cx - w / 2 + (x - Math.min(...xs)) * s, cy - h / 2 + (y - Math.min(...ys)) * s, s, BRICK_COLORS[kind]);
  ctx.globalAlpha = 1;
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
