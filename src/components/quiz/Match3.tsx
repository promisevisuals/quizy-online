import { useCallback, useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { LEVEL_NAMES, loadLevel, saveLevel, type ArcadeLevel } from "@/lib/quiz/arcade";
import {
  COLOR_NAMES,
  SIZE,
  adjacent,
  collapse,
  ensureMove,
  findMove,
  goalDone,
  goalProgress,
  levelFor,
  matchStep,
  newMatch,
  stars as starsFor,
  trySwap,
  type Match,
  type Piece,
  type Pos,
  type Step,
} from "@/lib/quiz/match3";
import { sfx } from "@/lib/quiz/sfx";
import { useQuiz } from "@/lib/quiz/store";
import { GameStage } from "@/components/quiz/GameStage";
import { LevelChoice, NoTickets, TicketCount, TicketHint, useTicket } from "@/components/quiz/FunGameKit";

const COLORS = ["#e8413f", "#f08a24", "#f5c518", "#3dbb5c", "#3a86e8", "#9a52d9"];
const DARK = ["#a51f22", "#b45a0b", "#b98d00", "#1f7c39", "#1d58a8", "#6a2ba3"];
const BLURBS: Record<ArcadeLevel, string> = {
  easy: "Lots of moves and five colours for longer",
  medium: "A few extra moves",
  hard: "Just enough moves",
  expert: "Fewer moves: plan your specials",
};

type Phase = "ready" | "playing" | "won" | "lost";
type Drawn = { x: number; y: number };
type Dying = { piece: Piece; x: number; y: number; t0: number };

export function Match3() {
  const age = useQuiz((s) => s.age);
  const park = useQuiz((s) => s.park);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const ticket = useTicket();
  const [diff, setDiff] = useState<ArcadeLevel>(() => loadLevel("match", age));
  const best = useQuiz((s) => s.arcadeBest[`match-${diff}`] ?? 0);
  const [levelN, setLevelN] = useState(1);
  const matchRef = useRef<Match>(newMatch(levelFor(1, diff)));
  const [phase, setPhaseState] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [noTicket, setNoTicket] = useState(false);
  const [runCoins, setRunCoins] = useState(0);
  const [toast, setToast] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const sizeRef = useRef({ cell: 40, w: 320 });
  const drawn = useRef(new Map<number, Drawn>());
  const dying = useRef<Dying[]>([]);
  const busy = useRef(false);
  const selected = useRef<Pos | null>(null);
  const shake = useRef<{ cells: Pos[]; until: number } | null>(null);
  const hint = useRef<[Pos, Pos] | null>(null);
  const lastAction = useRef(performance.now());
  const diffRef = useRef(diff);
  diffRef.current = diff;

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? "" : t)), 1300);
  }, []);

  function snapDrawn() {
    const m = matchRef.current;
    drawn.current.clear();
    m.grid.forEach((row, y) => row.forEach((p, x) => p && drawn.current.set(p.id, { x, y: y - SIZE - 1 + (SIZE - y) * 0.0 })));
  }

  function loadLevelN(n: number) {
    matchRef.current = newMatch(levelFor(n, diffRef.current));
    setLevelN(n);
    dying.current = [];
    selected.current = null;
    hint.current = null;
    snapDrawn(); // sweets drop in from the top
    lastAction.current = performance.now();
    bump();
  }

  function startRun() {
    if (!ticket.spend()) {
      setNoTicket(true);
      return;
    }
    setNoTicket(false);
    setRunCoins(0);
    loadLevelN(1);
    sfx.start();
    setPhase("playing");
  }

  function chooseDiff(l: ArcadeLevel) {
    setDiff(l);
    saveLevel("match", l);
    diffRef.current = l;
    matchRef.current = newMatch(levelFor(1, l));
    snapDrawn();
    bump();
  }

  /* ---------- sizing ---------- */
  useEffect(() => {
    const wrap = wrapEl;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const side = Math.max(200, Math.min(wrap.clientWidth, wrap.clientHeight, 640));
      const cell = Math.floor(side / SIZE);
      const w = cell * SIZE;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = w * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${w}px`;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { cell, w };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [wrapEl]);

  /* ---------- resolving a move: pop, fall, repeat ---------- */
  const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
  const settled = () => {
    const m = matchRef.current;
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const p = m.grid[y]![x];
        const d = p && drawn.current.get(p.id);
        if (d && (Math.abs(d.x - x) > 0.03 || Math.abs(d.y - y) > 0.03)) return false;
      }
    return true;
  };
  async function untilSettled() {
    for (let i = 0; i < 40 && !settled(); i++) await wait(16);
  }

  function addDying(step: Step) {
    const now = performance.now();
    for (const c of step.cleared) {
      dying.current.push({ piece: c.piece, x: c.x, y: c.y, t0: now });
      drawn.current.delete(c.piece.id);
    }
    if (step.blasts) sfx.blast();
  }

  function placeNewPieces() {
    const m = matchRef.current;
    for (let x = 0; x < SIZE; x++) {
      let fresh = 0;
      for (let y = 0; y < SIZE; y++) if (m.grid[y]![x] && !drawn.current.has(m.grid[y]![x]!.id)) fresh++;
      for (let y = 0; y < SIZE; y++) {
        const p = m.grid[y]![x];
        if (p && !drawn.current.has(p.id)) drawn.current.set(p.id, { x, y: y - fresh - 0.5 });
      }
    }
  }

  async function resolve(first: Step) {
    busy.current = true;
    let step: Step | null = first;
    let cascade = 0;
    const m = matchRef.current;
    while (step) {
      addDying(step);
      sfx.pop(cascade);
      if (cascade >= 2) showToast(cascade >= 4 ? "Sweet!!" : cascade >= 3 ? "Delicious!" : "Tasty!");
      bump();
      await wait(190);
      collapse(m);
      placeNewPieces();
      bump();
      await untilSettled();
      step = matchStep(m);
      cascade++;
    }
    if (goalDone(m)) {
      await wait(250);
      levelWon();
    } else if (m.movesLeft <= 0) {
      await wait(250);
      levelLost();
    } else if (ensureMove(m)) {
      showToast("No moves left. Mixing!");
      snapToGrid();
      bump();
    }
    hint.current = null;
    lastAction.current = performance.now();
    busy.current = false;
    bump();
  }

  function snapToGrid() {
    const m = matchRef.current;
    m.grid.forEach((row, y) => row.forEach((p, x) => p && drawn.current.set(p.id, { x: x + (Math.random() - 0.5) * 2, y: y + (Math.random() - 0.5) * 2 })));
  }

  function levelWon() {
    const m = matchRef.current;
    m.score += m.movesLeft * 60;
    const st = starsFor(m);
    const coins = 10 + st * 5;
    setRunCoins((c) => c + coins);
    const reached = m.level.n;
    arcadeReward(`match-${diffRef.current}`, reached, 0);
    arcadeReward("match", reached, coins);
    sfx.win();
    setPhase("won");
  }

  function levelLost() {
    sfx.gameOver();
    setPhase("lost");
  }

  function attempt(a: Pos, b: Pos) {
    if (busy.current || phaseRef.current !== "playing") return;
    lastAction.current = performance.now();
    hint.current = null;
    selected.current = null;
    const step = trySwap(matchRef.current, a, b);
    if (!step) {
      sfx.wrong();
      shake.current = { cells: [a, b], until: performance.now() + 320 };
      bump();
      return;
    }
    bump();
    void resolve(step);
  }

  /* ---------- drawing loop ---------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const m = matchRef.current;
      // ease every sweet toward its cell
      const k = 1 - Math.pow(0.0001, dt / 1000 / 0.35);
      for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++) {
          const p = m.grid[y]![x];
          if (!p) continue;
          const d = drawn.current.get(p.id);
          if (!d) {
            drawn.current.set(p.id, { x, y });
            continue;
          }
          d.x += (x - d.x) * Math.min(1, k * 1.4);
          // falling speeds up a little, like gravity
          const fall = y - d.y;
          d.y += fall > 0 ? Math.min(fall, Math.max(fall * k * 1.4, (dt / 1000) * 14)) : fall * Math.min(1, k * 1.4);
        }
      if (!busy.current && phaseRef.current === "playing" && now - lastAction.current > 6000 && !hint.current) hint.current = findMove(m.grid);
      draw(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw(now: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { cell, w } = sizeRef.current;
    const m = matchRef.current;
    ctx.clearRect(0, 0, w, w);
    // board
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        ctx.fillStyle = (x + y) % 2 ? "rgba(120,72,30,0.20)" : "rgba(120,72,30,0.12)";
        rr(ctx, x * cell + 1, y * cell + 1, cell - 2, cell - 2, cell * 0.18);
        ctx.fill();
      }
    const sel = selected.current;
    if (sel) {
      ctx.strokeStyle = "#fffaf0";
      ctx.lineWidth = 3;
      rr(ctx, sel[0] * cell + 2, sel[1] * cell + 2, cell - 4, cell - 4, cell * 0.2);
      ctx.stroke();
    }
    const sh = shake.current && now < shake.current.until ? shake.current : null;
    const hintOn = hint.current && Math.floor(now / 400) % 2 === 0 ? hint.current : null;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, w);
    ctx.clip();
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const p = m.grid[y]![x];
        if (!p) continue;
        const d = drawn.current.get(p.id) ?? { x, y };
        let ox = 0;
        if (sh?.cells.some(([sx, sy]) => sx === x && sy === y)) ox = Math.sin(now / 25) * cell * 0.08;
        const pulse = hintOn?.some(([hx, hy]) => hx === x && hy === y) ? 1.12 : 1;
        drawPiece(ctx, p, (d.x + 0.5) * cell + ox, (d.y + 0.5) * cell, cell * 0.42 * pulse, now);
      }
    // popping sweets
    dying.current = dying.current.filter((dd) => now - dd.t0 < 260);
    for (const dd of dying.current) {
      const t = (now - dd.t0) / 260;
      ctx.globalAlpha = 1 - t;
      drawPiece(ctx, dd.piece, (dd.x + 0.5) * cell, (dd.y + 0.5) * cell, cell * 0.42 * (1 + t * 0.6), now);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ---------- input: drag a sweet, or tap two neighbours ---------- */
  const press = useRef<{ pos: Pos; x: number; y: number; used: boolean } | null>(null);
  function cellAt(e: React.PointerEvent): Pos | null {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { cell } = sizeRef.current;
    const x = Math.floor((e.clientX - rect.left) / cell);
    const y = Math.floor((e.clientY - rect.top) / cell);
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? [x, y] : null;
  }
  function onDown(e: React.PointerEvent) {
    if (busy.current || phaseRef.current !== "playing") return;
    const pos = cellAt(e);
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    press.current = { pos, x: e.clientX, y: e.clientY, used: false };
  }
  function onMove(e: React.PointerEvent) {
    const p = press.current;
    if (!p || p.used) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    const min = sizeRef.current.cell * 0.35;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return;
    p.used = true;
    const to: Pos = Math.abs(dx) > Math.abs(dy) ? [p.pos[0] + Math.sign(dx), p.pos[1]] : [p.pos[0], p.pos[1] + Math.sign(dy)];
    if (to[0] < 0 || to[1] < 0 || to[0] >= SIZE || to[1] >= SIZE) return;
    attempt(p.pos, to);
  }
  function onUp() {
    const p = press.current;
    press.current = null;
    if (!p || p.used) return;
    const sel = selected.current;
    if (sel && adjacent(sel, p.pos)) attempt(sel, p.pos);
    else {
      selected.current = sel && sel[0] === p.pos[0] && sel[1] === p.pos[1] ? null : p.pos;
      sfx.tick();
    }
  }

  const m = matchRef.current;
  const prog = goalProgress(m);
  const goal = m.level.goal;
  const goalText =
    goal.kind === "score"
      ? `Score ${goal.target.toLocaleString()}`
      : goal.kind === "collect"
        ? `Pop ${goal.count} ${COLOR_NAMES[goal.color]} sweets`
        : `Break ${goal.count} crates`;
  const st = starsFor(m);

  return (
    <GameStage
      title="Sweet Swap"
      onBack={() => park("map")}
      stats={
        <>
          <TicketCount />
          <span className="snake-score">
            <b>{m.movesLeft}</b>
            <small>moves</small>
          </span>
        </>
      }
    >
      <div className="match-goal">
        <span className="match-level">Level {levelN}</span>
        <span className="min-w-0 flex-1">
          <b className="flex items-center gap-1 text-sm">
            {goal.kind === "collect" ? <i className="match-dot" style={{ background: COLORS[goal.color] }} aria-hidden /> : goal.kind === "crates" ? <span aria-hidden>📦</span> : null}
            {goalText}
          </b>
          <span className="match-bar" aria-hidden>
            <span style={{ width: `${(prog.have / prog.need) * 100}%` }} />
          </span>
        </span>
        <span className="text-right">
          <b className="block font-display text-lg leading-none">{m.score.toLocaleString()}</b>
          <small className="text-xs font-bold text-muted">
            {goal.kind === "score" ? "" : `${prog.have}/${prog.need}`}
          </small>
        </span>
      </div>
      <div ref={setWrapEl} className="match-wrap">
        <canvas
          ref={canvasRef}
          className="match-board"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => (press.current = null)}
          aria-label="Sweet Swap board. Drag a sweet onto its neighbour, or tap two neighbours, to swap them."
        />
        {toast ? <p className="match-toast">{toast}</p> : null}
        {phase !== "playing" && (
          <div className="snake-overlay" role="status">
            <div className="snake-card">
              {phase === "ready" && (
                <>
                  <p className="font-display text-2xl font-semibold">Sweet Swap</p>
                  <p className="mt-1 text-sm">Swap two sweets to line up 3 or more of the same colour. Beat each level's goal before your moves run out.</p>
                  <p className="mt-1 text-xs font-bold text-muted">4 in a line = striped · L or T = bomb · 5 in a line = rainbow ball</p>
                  <div className="mt-3">
                    <LevelChoice level={diff} onChange={chooseDiff} blurb={`${BLURBS[diff]}. Best: level ${best}`} />
                  </div>
                </>
              )}
              {phase === "won" && (
                <>
                  <p className="font-display text-2xl font-semibold">Level {levelN} done!</p>
                  <p className="mt-1 flex justify-center gap-1" aria-label={`${st} stars`}>
                    {[1, 2, 3].map((i) => (
                      <Star key={i} className={i <= st ? "size-8 fill-gold text-gold" : "size-8 text-line"} aria-hidden />
                    ))}
                  </p>
                  <p className="mt-1 font-extrabold">
                    {m.score.toLocaleString()} points · {runCoins} coins so far
                  </p>
                  <button type="button" onClick={() => { loadLevelN(levelN + 1); setPhase("playing"); sfx.start(); }} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                    Next level
                  </button>
                  <p className="mt-1 text-xs font-bold text-muted">Keep going on this ticket until a level beats you</p>
                </>
              )}
              {phase === "lost" && (
                <>
                  <p className="font-display text-2xl font-semibold">Out of moves</p>
                  <p className="mt-1 text-sm">
                    {goalText}: {prog.have.toLocaleString()} of {prog.need.toLocaleString()}
                  </p>
                  <p className="mt-1 font-extrabold">
                    You reached level {levelN} · {runCoins} coins
                  </p>
                  <p className="text-xs font-bold text-muted">
                    {LEVEL_NAMES[diff]} best: level {Math.max(best, levelN - 1)}
                  </p>
                  <div className="mt-3">
                    <LevelChoice level={diff} onChange={chooseDiff} />
                  </div>
                </>
              )}
              {phase !== "won" &&
                (noTicket ? (
                  <NoTickets />
                ) : (
                  <>
                    <button type="button" onClick={startRun} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                      {phase === "lost" ? "Try again from level 1" : "Start"}
                    </button>
                    <TicketHint />
                  </>
                ))}
            </div>
          </div>
        )}
      </div>
    </GameStage>
  );
}

function drawPiece(ctx: CanvasRenderingContext2D, p: Piece, cx: number, cy: number, r: number, now: number) {
  if (p.color === -1) {
    // crate
    ctx.fillStyle = "#a8692f";
    rr(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.18);
    ctx.fill();
    ctx.strokeStyle = "#6e3f14";
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.8, cy - r * 0.8);
    ctx.lineTo(cx + r * 0.8, cy + r * 0.8);
    ctx.moveTo(cx + r * 0.8, cy - r * 0.8);
    ctx.lineTo(cx - r * 0.8, cy + r * 0.8);
    ctx.stroke();
    return;
  }
  if (p.special === "rainbow") {
    const grad = ctx.createConicGradient?.((now / 600) % (Math.PI * 2), cx, cy);
    if (grad) {
      COLORS.forEach((c, i) => grad.addColorStop(i / COLORS.length, c));
      grad.addColorStop(1, COLORS[0]!);
      ctx.fillStyle = grad;
    } else ctx.fillStyle = "#9a52d9";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2416";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + now / 900;
      ctx.fillStyle = COLORS[i % COLORS.length]!;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.32, cy + Math.sin(a) * r * 0.32, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const c = COLORS[p.color]!;
  const dk = DARK[p.color]!;
  ctx.fillStyle = c;
  ctx.strokeStyle = dk;
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.beginPath();
  switch (p.color) {
    case 0: // round drop
      ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
      break;
    case 1: // square sweet
      rr(ctx, cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6, r * 0.35);
      break;
    case 2: // star
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? r * 0.48 : r * 0.98;
        ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      ctx.closePath();
      break;
    case 3: // leaf / triangle
      ctx.moveTo(cx, cy - r * 0.92);
      ctx.quadraticCurveTo(cx + r * 1.1, cy + r * 0.8, cx, cy + r * 0.85);
      ctx.quadraticCurveTo(cx - r * 1.1, cy + r * 0.8, cx, cy - r * 0.92);
      break;
    case 4: // diamond
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.85, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.85, cy);
      ctx.closePath();
      break;
    default: // hexagon
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
      }
      ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  // shine
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.28, cy - r * 0.35, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  if (p.special === "row" || p.special === "col") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = -2; i <= 2; i++) {
      if (p.special === "row") ctx.fillRect(cx - r, cy + i * r * 0.36 - r * 0.07, r * 2, r * 0.14);
      else ctx.fillRect(cx + i * r * 0.36 - r * 0.07, cy - r, r * 0.14, r * 2);
    }
    ctx.restore();
  }
  if (p.special === "bomb") {
    ctx.strokeStyle = "#fffaf0";
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.setLineDash([r * 0.25, r * 0.18]);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.02, now / 300, now / 300 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}
