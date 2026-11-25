import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsUp, Heart, Pause, Play as PlayIcon } from "lucide-react";
import { LEVEL_NAMES, loadLevel, saveLevel, type ArcadeLevel } from "@/lib/quiz/arcade";
import { BIG_R, H, LEVELS, loadWorld, step, tileAt, type Event, type World } from "@/lib/quiz/bounce";
import { sfx } from "@/lib/quiz/sfx";
import { useQuiz } from "@/lib/quiz/store";
import { GameStage } from "@/components/quiz/GameStage";
import { LevelChoice, NoTickets, TicketCount, TicketHint, useTicket } from "@/components/quiz/FunGameKit";

const LIVES: Record<ArcadeLevel, number> = { easy: 6, medium: 4, hard: 3, expert: 2 };
const BLURBS: Record<ArcadeLevel, string> = {
  easy: "6 lives to start",
  medium: "4 lives to start",
  hard: "3 lives to start",
  expert: "Only 2 lives",
};

type Phase = "ready" | "playing" | "paused" | "levelDone" | "over" | "allDone";
type Pop = { x: number; y: number; vx: number; vy: number; t: number; color: string };

export function Bounce() {
  const age = useQuiz((s) => s.age);
  const park = useQuiz((s) => s.park);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const reached = useQuiz((s) => s.arcadeBest["bounce"] ?? 0);
  const ticket = useTicket();
  const [diff, setDiff] = useState<ArcadeLevel>(() => loadLevel("bounce", age));
  const [startAt, setStartAt] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhaseState] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [noTicket, setNoTicket] = useState(false);
  const worldRef = useRef<World>(loadWorld(LEVELS[0]!));
  const [hud, setHud] = useState({ lives: 3, rings: 0, score: 0 });
  const totalScore = useRef(0);
  const [runCoins, setRunCoins] = useState(0);
  const input = useRef({ left: false, right: false, held: false, jump: false });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const size = useRef({ w: 360, h: 600, tile: 40 });
  const pops = useRef<Pop[]>([]);
  const cam = useRef({ x: 0, y: 0 });
  const [banner, setBanner] = useState("");

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const syncHud = useCallback(() => {
    const w = worldRef.current;
    setHud((h) => (h.lives === w.lives && h.rings === w.ringsLeft && h.score === w.score ? h : { lives: w.lives, rings: w.ringsLeft, score: w.score }));
  }, []);

  const showBanner = useCallback((text: string, ms = 1800) => {
    setBanner(text);
    window.setTimeout(() => setBanner((b) => (b === text ? "" : b)), ms);
  }, []);

  function openLevel(index: number, lives: number) {
    worldRef.current = loadWorld(LEVELS[index]!, lives);
    setLevelIndex(index);
    cam.current = { x: 0, y: 0 };
    pops.current = [];
    input.current = { left: false, right: false, held: false, jump: false };
    syncHud();
    showBanner(`Level ${index + 1}: ${LEVELS[index]!.name}`, 2200);
  }

  function start() {
    if (!ticket.spend()) {
      setNoTicket(true);
      return;
    }
    setNoTicket(false);
    totalScore.current = 0;
    setRunCoins(0);
    openLevel(startAt, LIVES[diff]);
    sfx.start();
    setPhase("playing");
  }

  function nextLevel() {
    const lives = worldRef.current.lives;
    openLevel(levelIndex + 1, lives);
    sfx.start();
    setPhase("playing");
  }

  function chooseDiff(l: ArcadeLevel) {
    setDiff(l);
    saveLevel("bounce", l);
  }

  const handleEvents = useCallback(
    (events: Event[]) => {
      const w = worldRef.current;
      for (const e of events) {
        if (e === "jump") sfx.jump();
        if (e === "boing") sfx.boing(2);
        if (e === "ring") sfx.ring();
        if (e === "crystal") {
          sfx.ring();
          showBanner("Checkpoint!", 1000);
        }
        if (e === "life") {
          sfx.levelUp();
          showBanner("+1 life!", 1000);
        }
        if (e === "pump") {
          sfx.turn();
          showBanner("Big ball! You can float now", 1500);
        }
        if (e === "deflate") {
          sfx.tick();
          showBanner("Small ball", 1000);
        }
        if (e === "gate") {
          sfx.levelUp();
          showBanner("All rings! The gate is open 🚪", 1800);
        }
        if (e === "die") {
          sfx.wrong();
          const b = w.ball;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            pops.current.push({ x: b.x, y: b.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5 - 2, t: 0, color: i % 2 ? "#e2483f" : "#ffd6c9" });
          }
          if (w.gameOver) {
            totalScore.current += w.score;
            const coins = Math.round(totalScore.current / 400);
            arcadeReward("bounce", levelIndexRef.current + 1, coins);
            setRunCoins((c) => c + coins);
            window.setTimeout(() => {
              sfx.gameOver();
              setPhase("over");
            }, 900);
          }
        }
        if (e === "win") {
          sfx.win();
          totalScore.current += w.score;
          const coins = 10 + w.lives * 3 + Math.round(w.score / 600);
          setRunCoins((c) => c + coins);
          arcadeReward(`bounce-${diffRef.current}`, levelIndexRef.current + 2, 0);
          arcadeReward("bounce", levelIndexRef.current + 2, coins);
          window.setTimeout(() => setPhase(levelIndexRef.current + 1 >= LEVELS.length ? "allDone" : "levelDone"), 700);
        }
      }
      syncHud();
    },
    [arcadeReward, setPhase, showBanner, syncHud],
  );
  const levelIndexRef = useRef(0);
  levelIndexRef.current = levelIndex;
  const diffRef = useRef(diff);
  diffRef.current = diff;

  /* ---------- sizing ---------- */
  useEffect(() => {
    const wrap = wrapEl;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.current = { w, h, tile: Math.max(18, Math.min(h / (H - 1.5), w / 8.5)) };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [wrapEl]);

  /* ---------- game loop ---------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const STEP = 1 / 120;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (phaseRef.current === "playing") {
        acc += dt;
        while (acc >= STEP) {
          const events = step(worldRef.current, { ...input.current }, STEP);
          input.current.jump = false;
          if (events.length) handleEvents(events);
          acc -= STEP;
        }
      } else acc = 0;
      for (const p of pops.current) {
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 12 * dt;
      }
      pops.current = pops.current.filter((p) => p.t < 0.8);
      draw(now / 1000, dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleEvents]);

  function draw(t: number, dt: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { w: cw, h: ch, tile } = size.current;
    const world = worldRef.current;
    const b = world.ball;
    // camera follows the ball, a little ahead of where it rolls
    const viewW = cw / tile;
    const viewH = ch / tile;
    const tx = Math.max(0, Math.min(world.w - viewW, b.x - viewW * 0.4 + b.vx * 0.25));
    // a tall screen shows extra sky above the level, with the ground at the bottom
    const ty = viewH >= H ? H - viewH : Math.max(0, Math.min(H - viewH, b.y - viewH * 0.55));
    cam.current.x += (tx - cam.current.x) * Math.min(1, dt * 6);
    cam.current.y += (ty - cam.current.y) * Math.min(1, dt * 6);
    if (Math.abs(tx - cam.current.x) > viewW) cam.current.x = tx;
    const cx = cam.current.x;
    const cy = cam.current.y;

    // sky and hills
    const sky = ctx.createLinearGradient(0, 0, 0, ch);
    sky.addColorStop(0, "#bfe8f5");
    sky.addColorStop(1, "#f4f0d6");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "#a9d8a0";
    hills(ctx, cw, ch, cx * tile * 0.2, ch * 0.62, 90, 0.9);
    ctx.fillStyle = "#79c07a";
    hills(ctx, cw, ch, cx * tile * 0.45, ch * 0.72, 60, 1.6);

    const x0 = Math.floor(cx) - 1;
    const x1 = Math.ceil(cx + viewW) + 1;
    const y0 = Math.max(0, Math.floor(cy) - 1);
    const y1 = Math.min(H, Math.ceil(cy + viewH) + 1);
    const sx = (x: number) => (x - cx) * tile;
    const sy = (y: number) => (y - cy) * tile;

    for (let y = y0; y < y1; y++)
      for (let x = x0; x <= x1; x++) {
        const c = tileAt(world, x, y);
        const px = sx(x);
        const py = sy(y);
        if (c === "#") brick(ctx, px, py, tile, tileAt(world, x, y - 1) !== "#" && tileAt(world, x, y - 1) !== "R");
        else if (c === "R") rubber(ctx, px, py, tile, t);
        else if (c === "^") spikes(ctx, px, py, tile, false);
        else if (c === "v") spikes(ctx, px, py, tile, true);
        else if (c === "~") {
          ctx.fillStyle = "rgba(58,134,232,0.45)";
          ctx.fillRect(px, py, tile + 1, tile + 1);
          if (tileAt(world, x, y - 1) !== "~") {
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            for (let i = 0; i < 3; i++) ctx.fillRect(px + ((i * tile) / 3 + ((t * 20) % (tile / 3))), py + Math.sin(t * 3 + x + i) * 2, tile / 6, 2);
          }
        } else if (c === "E") gate(ctx, px, py, tile, world.ringsLeft === 0, tileAt(world, x, y - 1) !== "E", t);
      }

    for (const it of world.items) {
      if (it.taken && it.kind !== "crystal") continue;
      const px = sx(it.x);
      const py = sy(it.y);
      if (px < -tile || px > cw + tile) continue;
      if (it.kind === "ring") {
        ctx.strokeStyle = "#f2b31b";
        ctx.lineWidth = tile * 0.14;
        ctx.beginPath();
        ctx.ellipse(px, py, tile * 0.22, tile * 0.48, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = tile * 0.04;
        ctx.beginPath();
        ctx.ellipse(px - tile * 0.04, py - tile * 0.05, tile * 0.18, tile * 0.42, 0, Math.PI * 1.1, Math.PI * 1.6);
        ctx.stroke();
      } else if (it.kind === "crystal") {
        ctx.fillStyle = it.taken ? "#4cbf7d" : "#5fd0ef";
        ctx.beginPath();
        ctx.moveTo(px, py - tile * 0.42);
        ctx.lineTo(px + tile * 0.26, py);
        ctx.lineTo(px, py + tile * 0.48);
        ctx.lineTo(px - tile * 0.26, py);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillRect(px - tile * 0.05, py - tile * 0.25, tile * 0.08, tile * 0.3);
      } else if (it.kind === "life") {
        const s = 1 + Math.sin(t * 5) * 0.06;
        heart(ctx, px, py, tile * 0.36 * s);
      } else {
        ctx.fillStyle = it.kind === "pump" ? "#3fb661" : "#ef8a2a";
        ctx.beginPath();
        ctx.arc(px, py + tile * 0.1, tile * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `900 ${Math.round(tile * 0.6)}px Nunito, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(it.kind === "pump" ? "+" : "−", px, py + tile * 0.12);
      }
    }

    for (const th of world.thorns) thorn(ctx, sx(th.x), sy(th.y), tile * 0.38, t);

    if (!world.dead) {
      const r = b.r * tile;
      const px = sx(b.x);
      const py = sy(b.y);
      const grad = ctx.createRadialGradient(px - r * 0.35, py - r * 0.35, r * 0.1, px, py, r);
      grad.addColorStop(0, "#ff8f7a");
      grad.addColorStop(1, b.r >= BIG_R ? "#b8241c" : "#d8322a");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(90,10,10,0.5)";
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath();
      ctx.arc(px, py, r * 0.62, b.spin, b.spin + Math.PI * 0.6);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.ellipse(px - r * 0.35, py - r * 0.4, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of pops.current) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / 0.8);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), tile * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") input.current.left = true;
      else if (k === "ArrowRight" || k === "d" || k === "D") input.current.right = true;
      else if (k === "ArrowUp" || k === " " || k === "w" || k === "W") {
        if (!e.repeat) input.current.jump = true;
        input.current.held = true;
      } else if (k === "p" || k === "P" || k === "Escape") {
        if (phaseRef.current === "playing") setPhase("paused");
        else if (phaseRef.current === "paused") setPhase("playing");
        return;
      } else return;
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") input.current.left = false;
      if (k === "ArrowRight" || k === "d" || k === "D") input.current.right = false;
      if (k === "ArrowUp" || k === " " || k === "w" || k === "W") input.current.held = false;
    };
    const vis = () => {
      if (document.hidden && phaseRef.current === "playing") setPhase("paused");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [setPhase]);

  function pad(which: "left" | "right" | "jump") {
    const on = (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      if (which === "jump") {
        input.current.jump = true;
        input.current.held = true;
      } else input.current[which] = true;
    };
    const off = () => {
      if (which === "jump") input.current.held = false;
      else input.current[which] = false;
    };
    return { onPointerDown: on, onPointerUp: off, onPointerCancel: off, onLostPointerCapture: off, onContextMenu: (e: React.MouseEvent) => e.preventDefault() };
  }

  const world = worldRef.current;
  const unlocked = Math.min(LEVELS.length, Math.max(1, reached));

  return (
    <GameStage
      title="Bouncy Ball"
      full
      onBack={() => park("map")}
      heading={
        <div className="bounce-hud min-w-0">
          <span className="bounce-level">L{levelIndex + 1}</span>
          <span className="flex items-center" aria-label={`${hud.lives} lives`}>
            <Heart className="size-[1.15rem] fill-bad text-bad" aria-hidden />
            <b className="ml-0.5">{hud.lives}</b>
          </span>
          <span className="bounce-rings" aria-label={`${hud.rings} rings left`}>
            <i aria-hidden />
            <b>{hud.rings}</b>
          </span>
          <span className="hidden text-sm font-extrabold sm:inline">{(totalScore.current + hud.score).toLocaleString()}</span>
        </div>
      }
      stats={
        <>
          <TicketCount />
          {phase === "playing" || phase === "paused" ? (
            <button type="button" className="game-icon-btn" aria-label={phase === "paused" ? "Resume" : "Pause"} onClick={() => setPhase(phase === "paused" ? "playing" : "paused")}>
              {phase === "paused" ? <PlayIcon className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            </button>
          ) : null}
        </>
      }
    >
      <div ref={setWrapEl} className="bounce-wrap">
        <canvas ref={canvasRef} className="bounce-view" aria-label="Bouncy Ball. Use the arrow buttons to roll and the big button to jump, or arrow keys and space on a computer." />
        {banner && phase === "playing" ? <p className="bounce-banner">{banner}</p> : null}
        <div className="bounce-pad" aria-label="Controls">
          <div className="flex gap-2">
            <button type="button" aria-label="Roll left" {...pad("left")}>
              <ChevronLeft className="size-9" aria-hidden />
            </button>
            <button type="button" aria-label="Roll right" {...pad("right")}>
              <ChevronRight className="size-9" aria-hidden />
            </button>
          </div>
          <button type="button" className="is-jump" aria-label="Jump" {...pad("jump")}>
            <ChevronsUp className="size-9" aria-hidden />
          </button>
        </div>
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
              {phase === "levelDone" && (
                <>
                  <p className="font-display text-2xl font-semibold">Level {levelIndex + 1} done! 🎉</p>
                  <p className="mt-1 font-extrabold">
                    {world.score.toLocaleString()} points · {runCoins} coins so far
                  </p>
                  <p className="mt-1 text-sm">Next: {LEVELS[levelIndex + 1]?.name}</p>
                  <p className="text-xs text-muted">{LEVELS[levelIndex + 1]?.hint}</p>
                  <button type="button" onClick={nextLevel} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                    Next level
                  </button>
                </>
              )}
              {phase === "allDone" && (
                <>
                  <p className="font-display text-3xl font-semibold">You beat every level! 🏆</p>
                  <p className="mt-1 font-extrabold">
                    {(totalScore.current).toLocaleString()} points · {runCoins} coins
                  </p>
                  <p className="mt-1 text-sm">New levels are on the way. Try a harder level setting!</p>
                </>
              )}
              {(phase === "ready" || phase === "over" || phase === "allDone") && (
                <>
                  {phase === "ready" ? (
                    <>
                      <p className="font-display text-2xl font-semibold">Bouncy Ball</p>
                      <p className="mt-1 text-sm">Roll and jump through the jungle. Collect every gold ring to open the gate. Watch out for spikes and thorns!</p>
                    </>
                  ) : phase === "over" ? (
                    <>
                      <p className="font-display text-2xl font-semibold">Out of lives</p>
                      <p className="mt-1 font-extrabold">
                        Level {levelIndex + 1} · {totalScore.current.toLocaleString()} points · {runCoins} coins
                      </p>
                    </>
                  ) : null}
                  <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-gold">Start at level</p>
                  <div className="bounce-levels mt-1">
                    {LEVELS.map((lv, i) => (
                      <button key={lv.name} type="button" disabled={i >= unlocked} className={startAt === i ? "is-active" : ""} onClick={() => setStartAt(i)} aria-label={`Level ${i + 1}: ${lv.name}${i >= unlocked ? " (locked)" : ""}`}>
                        {i >= unlocked ? "🔒" : i + 1}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted">{LEVELS[startAt]!.name}: {LEVELS[startAt]!.hint}</p>
                  <div className="mt-3">
                    <LevelChoice level={diff} onChange={chooseDiff} blurb={BLURBS[diff]} />
                  </div>
                  {noTicket ? (
                    <NoTickets />
                  ) : (
                    <>
                      <button type="button" onClick={start} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                        {phase === "ready" ? "Start" : "Play again"}
                      </button>
                      <TicketHint />
                    </>
                  )}
                  <p className="mt-1 text-xs font-bold text-muted">
                    {LEVEL_NAMES[diff]} · beat a level to unlock the next one
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </GameStage>
  );
}

function hills(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number, base: number, amp: number, freq: number) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, base - Math.abs(Math.sin(((x + offset) / w) * Math.PI * freq)) * amp);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function brick(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, top: boolean) {
  ctx.fillStyle = "#b5462e";
  ctx.fillRect(x, y, s + 0.5, s + 0.5);
  ctx.strokeStyle = "#7d2a18";
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y + s / 2);
  ctx.lineTo(x + s, y + s / 2);
  ctx.moveTo(x + s / 2, y);
  ctx.lineTo(x + s / 2, y + s / 2);
  ctx.moveTo(x + s * 0.15, y + s / 2);
  ctx.lineTo(x + s * 0.15, y + s);
  ctx.moveTo(x + s * 0.85, y + s / 2);
  ctx.lineTo(x + s * 0.85, y + s);
  ctx.stroke();
  if (top) {
    ctx.fillStyle = "#4cae4c";
    ctx.fillRect(x, y, s + 0.5, s * 0.2);
    ctx.fillStyle = "#3a8f3a";
    for (let i = 0; i < 4; i++) ctx.fillRect(x + (i * s) / 4 + s * 0.06, y + s * 0.18, s * 0.08, s * 0.1);
  }
}

function rubber(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.fillStyle = "#2f7fd6";
  ctx.beginPath();
  ctx.roundRect?.(x + 1, y + 1, s - 2, s - 2, s * 0.2);
  if (!ctx.roundRect) ctx.rect(x + 1, y + 1, s - 2, s - 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(x + s * 0.18, y + s * 0.16 + Math.sin(t * 6) * 1.5, s * 0.64, s * 0.12);
  ctx.fillStyle = "#fff";
  ctx.font = `900 ${Math.round(s * 0.5)}px Nunito, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⇡", x + s / 2, y + s * 0.6);
}

function spikes(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, down: boolean) {
  ctx.fillStyle = "#6b7280";
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const bx = x + (i * s) / 3;
    ctx.beginPath();
    if (down) {
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + s / 3, y);
      ctx.lineTo(bx + s / 6, y + s * 0.65);
    } else {
      ctx.moveTo(bx, y + s);
      ctx.lineTo(bx + s / 3, y + s);
      ctx.lineTo(bx + s / 6, y + s * 0.35);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function gate(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, open: boolean, top: boolean, t: number) {
  if (open) {
    const glow = 0.6 + Math.sin(t * 4) * 0.2;
    ctx.fillStyle = `rgba(255,236,150,${glow})`;
    ctx.fillRect(x + s * 0.1, y, s * 0.8, s);
    if (top) {
      ctx.fillStyle = "#f2b31b";
      ctx.font = `900 ${Math.round(s * 0.5)}px Nunito, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("★", x + s / 2, y + s * 0.6);
    }
  } else {
    ctx.fillStyle = "#7a5a1e";
    ctx.fillRect(x + s * 0.05, y, s * 0.9, s);
    ctx.fillStyle = "#d4a02a";
    for (let i = 0; i < 3; i++) ctx.fillRect(x + s * (0.18 + i * 0.27), y, s * 0.1, s);
  }
}

function thorn(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 3);
  ctx.fillStyle = "#2d3748";
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = i % 2 ? r * 0.6 : r * 1.05;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e2483f";
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.arc(r * 0.2, -r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "#e2483f";
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.8);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.4, y - s * 0.2, x, y + s * 0.8);
  ctx.fill();
}
