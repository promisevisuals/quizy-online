import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsUp, Flame, Gem, Heart, Pause, Play as PlayIcon, Shield } from "lucide-react";
import { LEVEL_NAMES, loadLevel, saveLevel, type ArcadeLevel } from "@/lib/quiz/arcade";
import { BIG_R, H, HURT_TIME, LEVELS, WORLD_NAMES, crumbleAt, gateOpen, loadWorld, step, tileAt, type Carry, type Event, type World } from "@/lib/quiz/bounce";
import { sfx } from "@/lib/quiz/sfx";
import { useQuiz } from "@/lib/quiz/store";
import { GameStage } from "@/components/quiz/GameStage";
import { LevelChoice, MadeBy, NoTickets, TicketCount, TicketHint, useTicket } from "@/components/quiz/FunGameKit";

const LIVES: Record<ArcadeLevel, number> = { easy: 6, medium: 4, hard: 3, expert: 2 };
const BLURBS: Record<ArcadeLevel, string> = {
  easy: "6 lives to start",
  medium: "4 lives to start",
  hard: "3 lives to start",
  expert: "Only 2 lives",
};

type Theme = { sky: [string, string]; hills: [string, string]; brick: string; mortar: string; top: string; glow?: string };
const THEMES: Record<1 | 2 | 3, Theme> = {
  1: { sky: ["#bfe8f5", "#f4f0d6"], hills: ["#a9d8a0", "#79c07a"], brick: "#b5462e", mortar: "#7d2a18", top: "#4cae4c" },
  2: { sky: ["#241d47", "#4b3f80"], hills: ["#3a3170", "#2b2457"], brick: "#5d6a8c", mortar: "#363f5e", top: "#7fdcef", glow: "#9be8ff" },
  3: { sky: ["#2b0a0a", "#a3381b"], hills: ["#5c1c12", "#3d0f0a"], brick: "#4b3934", mortar: "#26191a", top: "#ff8a2a", glow: "#ffb347" },
};

type Phase = "ready" | "playing" | "paused" | "levelDone" | "over" | "allDone";
type Pop = { x: number; y: number; vx: number; vy: number; t: number; color: string };
type Hud = { lives: number; rings: number; score: number; gems: number; shield: boolean; fire: boolean; wings: boolean; star: boolean; boss: number; bossMax: number };

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
  const [hud, setHud] = useState<Hud>({ lives: 3, rings: 0, score: 0, gems: 0, shield: false, fire: false, wings: false, star: false, boss: 0, bossMax: 0 });
  const totalScore = useRef(0);
  const [runCoins, setRunCoins] = useState(0);
  const input = useRef({ left: false, right: false, held: false, jump: false, fire: false });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const size = useRef({ w: 360, h: 600, tile: 40 });
  const pops = useRef<Pop[]>([]);
  const cam = useRef({ x: 0, y: 0 });
  const [banner, setBanner] = useState("");
  const levelIndexRef = useRef(0);
  levelIndexRef.current = levelIndex;
  const diffRef = useRef(diff);
  diffRef.current = diff;

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const syncHud = useCallback(() => {
    const w = worldRef.current;
    const b = w.ball;
    const next: Hud = {
      lives: w.lives,
      rings: w.ringsLeft,
      score: w.score,
      gems: w.gems,
      shield: b.shield,
      fire: b.fire,
      wings: b.wings,
      star: b.star > 0,
      boss: w.boss && !w.boss.dead ? w.boss.hp : 0,
      bossMax: w.boss?.max ?? 0,
    };
    setHud((h) => ((Object.keys(next) as (keyof Hud)[]).every((k) => h[k] === next[k]) ? h : next));
  }, []);

  const showBanner = useCallback((text: string, ms = 1800) => {
    setBanner(text);
    window.setTimeout(() => setBanner((b) => (b === text ? "" : b)), ms);
  }, []);

  function openLevel(index: number, lives: number, carry: Carry = {}) {
    worldRef.current = loadWorld(LEVELS[index]!, lives, carry);
    setLevelIndex(index);
    cam.current = { x: 0, y: -99 };
    pops.current = [];
    input.current = { left: false, right: false, held: false, jump: false, fire: false };
    syncHud();
    const def = LEVELS[index]!;
    showBanner(def.boss ? `👑 Boss: ${def.boss}!` : `${WORLD_NAMES[def.world]} · Level ${index + 1}: ${def.name}`, 2400);
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
    const w = worldRef.current;
    openLevel(levelIndex + 1, w.lives, { shield: w.ball.shield, fire: w.ball.fire, wings: w.ball.wings, gems: w.gems });
    sfx.start();
    setPhase("playing");
  }

  function chooseDiff(l: ArcadeLevel) {
    setDiff(l);
    saveLevel("bounce", l);
  }

  const burst = useCallback((x: number, y: number, colors: string[], n = 14, speed = 5) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pops.current.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 2, t: 0, color: colors[i % colors.length]! });
    }
  }, []);

  const handleEvents = useCallback(
    (events: Event[]) => {
      const w = worldRef.current;
      const b = w.ball;
      for (const e of events) {
        if (e === "jump") sfx.jump();
        if (e === "boing") sfx.boing(2);
        if (e === "ring") sfx.ring();
        if (e === "gem") sfx.gem();
        if (e === "bump") sfx.bump();
        if (e === "stomp") {
          sfx.stomp();
          burst(b.x, b.y + b.r, ["#fff", "#ffd666"], 8, 3);
        }
        if (e === "burn") sfx.stomp();
        if (e === "fire") sfx.fire();
        if (e === "shoot") sfx.shoot();
        if (e === "quake") sfx.quake();
        if (e === "crumble") sfx.thud();
        if (e === "crystal") {
          sfx.ring();
          showBanner("Checkpoint!", 1000);
        }
        if (e === "life") {
          sfx.levelUp();
          showBanner("+1 life!", 1100);
        }
        if (e === "pump") {
          sfx.turn();
          showBanner("Big ball! You can float now", 1500);
        }
        if (e === "deflate") {
          sfx.tick();
          showBanner("Small ball", 1000);
        }
        if (e === "power") {
          sfx.power();
          showBanner(
            b.star > 0 ? "⭐ Star power! Nothing can hurt you!" : b.fire ? "🔥 Fire power! Press the fire button" : b.wings ? "🪽 Wings! Jump again in the air" : "🛡️ Shield! It saves you from one hit",
            1800,
          );
        }
        if (e === "hurt") {
          sfx.hurt();
          showBanner("Ouch! Power lost", 900);
        }
        if (e === "boss-hit") {
          sfx.bossHit();
          if (w.boss) burst(w.boss.x, w.boss.y - 0.8, ["#fff", "#ffd666", "#e2483f"], 12, 4);
        }
        if (e === "boss-dead") {
          sfx.fanfare();
          if (w.boss) burst(w.boss.x, w.boss.y, ["#ffd666", "#e2483f", "#9b5bd6", "#3fb661"], 40, 7);
          showBanner(`You beat the ${w.boss?.name}! 🏆 The gate is open`, 2600);
        }
        if (e === "gate" && !w.boss) {
          sfx.levelUp();
          showBanner("All rings! The gate is open 🚪", 1800);
        }
        if (e === "die") {
          sfx.wrong();
          burst(b.x, b.y, ["#e2483f", "#ffd6c9"], 16, 5);
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
          const coins = 10 + w.lives * 3 + Math.round(w.score / 600) + (w.def.boss ? 40 : 0);
          setRunCoins((c) => c + coins);
          arcadeReward(`bounce-${diffRef.current}`, levelIndexRef.current + 2, 0);
          arcadeReward("bounce", levelIndexRef.current + 2, coins);
          window.setTimeout(() => setPhase(levelIndexRef.current + 1 >= LEVELS.length ? "allDone" : "levelDone"), 700);
        }
      }
      syncHud();
    },
    [arcadeReward, burst, setPhase, showBanner, syncHud],
  );

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
    let hudT = 0;
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
        hudT += dt;
        if (hudT > 0.25) {
          hudT = 0;
          syncHud();
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
  }, [handleEvents, syncHud]);

  function draw(t: number, dt: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { w: cw, h: ch, tile } = size.current;
    const world = worldRef.current;
    const theme = THEMES[world.def.world];
    const b = world.ball;
    const viewW = cw / tile;
    const viewH = ch / tile;
    const tx = Math.max(0, Math.min(world.w - viewW, b.x - viewW * 0.4 + b.vx * 0.25));
    const ty = viewH >= H ? H - viewH : Math.max(0, Math.min(H - viewH, b.y - viewH * 0.55));
    if (cam.current.y === -99) cam.current = { x: tx, y: ty };
    cam.current.x += (tx - cam.current.x) * Math.min(1, dt * 6);
    cam.current.y += (ty - cam.current.y) * Math.min(1, dt * 6);
    if (Math.abs(tx - cam.current.x) > viewW) cam.current.x = tx;
    const shake = world.shake > 0 ? (Math.random() - 0.5) * world.shake * 0.6 : 0;
    const cx = cam.current.x + shake;
    const cy = cam.current.y + shake * 0.5;

    const sky = ctx.createLinearGradient(0, 0, 0, ch);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cw, ch);
    if (world.def.world === 2) {
      ctx.fillStyle = "rgba(155,232,255,0.5)";
      for (let i = 0; i < 30; i++) {
        const sx0 = (((i * 137) % 997) / 997) * cw - cx * tile * 0.1;
        ctx.fillRect(((sx0 % cw) + cw) % cw, ((i * 71) % 100) * (ch / 160), 2, 2);
      }
    }
    ctx.fillStyle = theme.hills[0];
    hills(ctx, cw, ch, cx * tile * 0.2, ch * 0.62, 90, 0.9, world.def.world === 2);
    ctx.fillStyle = theme.hills[1];
    hills(ctx, cw, ch, cx * tile * 0.45, ch * 0.72, 60, 1.6, world.def.world === 2);

    const x0 = Math.floor(cx) - 1;
    const x1 = Math.ceil(cx + viewW) + 1;
    const y0 = Math.max(0, Math.floor(cy) - 1);
    const y1 = Math.min(H, Math.ceil(cy + viewH) + 1);
    const sx = (x: number) => (x - cx) * tile;
    const sy = (y: number) => (y - cy) * tile;
    const open = gateOpen(world);

    for (let y = y0; y < y1; y++)
      for (let x = x0; x <= x1; x++) {
        const c = tileAt(world, x, y);
        const px = sx(x);
        const py = sy(y);
        if (c === "#") brick(ctx, px, py, tile, theme, tileAt(world, x, y - 1) !== "#" && tileAt(world, x, y - 1) !== "R");
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
        } else if (c === "=") lava(ctx, px, py, tile, t, x, tileAt(world, x, y - 1) !== "=");
        else if (c === "E") gate(ctx, px, py, tile, open, tileAt(world, x, y - 1) !== "E", t);
        else if (c === "?" || c === "P") qblock(ctx, px, py, tile, t, c === "P");
        else if (c === "k") usedBlock(ctx, px, py, tile);
        else if (c === "C") cannon(ctx, px, py, tile, b.x < x + 0.5 ? -1 : 1);
        else if (c === "c") {
          const cr = crumbleAt(world, x, y);
          if (cr && !cr.gone) crumble(ctx, px + (cr.t >= 0 ? Math.sin(t * 60) * 1.5 : 0), py, tile, cr.t >= 0);
        }
      }

    for (const p of world.platforms) plank(ctx, sx(p.x), sy(p.y), p.w * tile, p.h * tile, world.def.world);

    for (const it of world.items) {
      const px = sx(it.x);
      const py = sy(it.y);
      if (px < -tile || px > cw + tile) continue;
      if (it.taken) {
        if (it.kind === "gem" && it.vy !== undefined && it.vy < 6) gem(ctx, px, py, tile * 0.3);
        if (it.kind !== "crystal") continue;
      }
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
      } else if (it.kind === "gem") gem(ctx, px, py + Math.sin(t * 4 + it.x) * 2, tile * 0.24);
      else if (it.kind === "crystal") {
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
      } else if (it.kind === "life") heart(ctx, px, py, tile * 0.36 * (1 + Math.sin(t * 5) * 0.06));
      else if (it.kind === "pump" || it.kind === "deflate") {
        ctx.fillStyle = it.kind === "pump" ? "#3fb661" : "#ef8a2a";
        ctx.beginPath();
        ctx.arc(px, py + tile * 0.1, tile * 0.38, 0, Math.PI * 2);
        ctx.fill();
        label(ctx, it.kind === "pump" ? "+" : "−", px, py + tile * 0.12, tile * 0.6, "#fff");
      } else powerItem(ctx, it.kind, px, py + Math.sin(t * 4) * 2, tile, t);
    }

    for (const e of world.enemies) {
      if (!e.alive) continue;
      const px = sx(e.x);
      const py = sy(e.y);
      if (px < -tile * 2 || px > cw + tile * 2) continue;
      if (e.kind === "thorn") {
        if (world.def.world === 3 && e.vy) fireball(ctx, px, py, tile * 0.38, t);
        else thorn(ctx, px, py, tile * 0.38, t);
      } else if (e.kind === "bug") bug(ctx, px, py, tile * 0.36, t, e.vx);
      else if (e.kind === "stone") stone(ctx, px, py, tile * 0.34, !!e.falling, t);
      else if (e.kind === "bullet") bullet(ctx, px, py, tile * 0.3, e.vx);
      else if (e.kind === "spit") thorn(ctx, px, py, tile * 0.33, t * 2);
    }

    if (world.boss && !world.boss.dead) drawBoss(ctx, world.boss, sx(world.boss.x), sy(world.boss.y), tile, t);
    for (const f of world.fires) fireball(ctx, sx(f.x), sy(f.y), tile * 0.2, t);
    if (!world.dead) drawBall(ctx, world, sx(b.x), sy(b.y), tile, t);

    for (const p of pops.current) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / 0.8);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), tile * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const k = world.boss;
    if (k && !k.dead) {
      const bw = Math.min(cw * 0.6, 260);
      const bx = (cw - bw) / 2;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      rr(ctx, bx - 6, 8, bw + 12, 30, 10);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "800 12px Nunito, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(k.name.toUpperCase(), cw / 2, 21);
      ctx.fillStyle = "#3a1010";
      ctx.fillRect(bx, 25, bw, 8);
      ctx.fillStyle = "#e2483f";
      ctx.fillRect(bx, 25, (bw * k.hp) / k.max, 8);
    }
    // a small maker's mark
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = world.def.world === 1 ? "#2a2416" : "#fff";
    ctx.font = "900 10px Nunito, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("PV", cw - 8, k && !k.dead ? 52 : 16);
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
      } else if (k === "f" || k === "F" || k === "x" || k === "X") input.current.fire = true;
      else if (k === "p" || k === "P" || k === "Escape") {
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
      if (k === "f" || k === "F" || k === "x" || k === "X") input.current.fire = false;
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

  function pad(which: "left" | "right" | "jump" | "fire") {
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
  const def = LEVELS[levelIndex]!;
  const nextDef = LEVELS[levelIndex + 1];

  return (
    <GameStage
      title="Bouncy Ball"
      full
      onBack={() => park("map")}
      heading={
        <div className="bounce-hud min-w-0">
          <span className="bounce-level">{def.boss ? "👑" : `${def.world}-${levelIndex + 1 - LEVELS.findIndex((l) => l.world === def.world)}`}</span>
          <span className="flex items-center" aria-label={`${hud.lives} lives`}>
            <Heart className="size-[1.15rem] fill-bad text-bad" aria-hidden />
            <b className="ml-0.5">{hud.lives}</b>
          </span>
          {hud.bossMax ? null : (
            <span className="bounce-rings" aria-label={`${hud.rings} rings left`}>
              <i aria-hidden />
              <b>{hud.rings}</b>
            </span>
          )}
          <span className="flex items-center" aria-label={`${hud.gems} gems`}>
            <Gem className="size-4 text-[#2bb5c9]" aria-hidden />
            <b className="ml-0.5 text-sm">{hud.gems}</b>
          </span>
          <span className="bounce-powers" aria-label="Powers">
            {hud.star ? <span title="Star">⭐</span> : null}
            {hud.fire ? <Flame className="size-4 text-[#ef6a1a]" aria-label="Fire" /> : null}
            {hud.shield ? <Shield className="size-4 text-[#3a86e8]" aria-label="Shield" /> : null}
            {hud.wings ? <span title="Wings">🪽</span> : null}
          </span>
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
        <canvas ref={canvasRef} className="bounce-view" aria-label="Bouncy Ball. Use the arrow buttons to roll and the big button to jump, or arrow keys and space on a computer. F spits fire." />
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
          <div className="flex items-end gap-2">
            {hud.fire ? (
              <button type="button" className="is-fire" aria-label="Spit fire" {...pad("fire")}>
                <Flame className="size-8" aria-hidden />
              </button>
            ) : null}
            <button type="button" className="is-jump" aria-label="Jump" {...pad("jump")}>
              <ChevronsUp className="size-9" aria-hidden />
            </button>
          </div>
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
              {phase === "levelDone" && nextDef && (
                <>
                  <p className="font-display text-2xl font-semibold">{def.boss ? `${def.boss} beaten! 🏆` : `Level ${levelIndex + 1} done! 🎉`}</p>
                  <p className="mt-1 font-extrabold">
                    {world.score.toLocaleString()} points · {runCoins} coins so far
                  </p>
                  {nextDef.world !== def.world ? <p className="mt-2 font-display text-lg font-semibold text-gold">New world: {WORLD_NAMES[nextDef.world]}!</p> : null}
                  <p className="mt-1 text-sm">Next: {nextDef.name}</p>
                  <p className="text-xs text-muted">{nextDef.hint}</p>
                  <p className="mt-1 text-xs font-bold text-muted">Your powers and gems come with you.</p>
                  <button type="button" onClick={nextLevel} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                    {nextDef.boss ? "Face the boss!" : "Next level"}
                  </button>
                </>
              )}
              {phase === "allDone" && (
                <>
                  <p className="font-display text-3xl font-semibold">You beat all three worlds! 🏆</p>
                  <p className="mt-1 font-extrabold">
                    {totalScore.current.toLocaleString()} points · {runCoins} coins
                  </p>
                  <p className="mt-1 text-sm">You're a Bouncy Ball champion. Try Expert next!</p>
                </>
              )}
              {(phase === "ready" || phase === "over" || phase === "allDone") && (
                <>
                  {phase === "ready" ? (
                    <>
                      <p className="font-display text-2xl font-semibold">Bouncy Ball</p>
                      <p className="mt-1 text-sm">Roll, jump and squash bugs across three worlds. Collect every ring to open the gate, grab power-ups, and beat the boss at the end of each world!</p>
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
                  <div className="bounce-worlds mt-1">
                    {[1, 2, 3].map((wn) => (
                      <div key={wn} className="bounce-world">
                        <span className="bounce-world-name">{WORLD_NAMES[wn]}</span>
                        <div className="bounce-levels">
                          {LEVELS.map((lv, i) =>
                            lv.world !== wn ? null : (
                              <button
                                key={lv.name}
                                type="button"
                                disabled={i >= unlocked}
                                className={startAt === i ? "is-active" : lv.boss ? "is-boss" : ""}
                                onClick={() => setStartAt(i)}
                                aria-label={`Level ${i + 1}: ${lv.name}${i >= unlocked ? " (locked)" : ""}`}
                              >
                                {i >= unlocked ? "🔒" : lv.boss ? "👑" : i + 1}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    <b>{LEVELS[startAt]!.name}:</b> {LEVELS[startAt]!.hint}
                  </p>
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
                  <p className="mt-1 text-xs font-bold text-muted">{LEVEL_NAMES[diff]} · beat a level to unlock the next one</p>
                  <MadeBy />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </GameStage>
  );
}

/* ───────── drawing helpers ───────── */

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

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.font = `900 ${Math.round(size)}px Nunito, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.textBaseline = "alphabetic";
}

function hills(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number, base: number, amp: number, freq: number, pointy: boolean) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) {
    const s = Math.sin(((x + offset) / w) * Math.PI * freq);
    ctx.lineTo(x, base - (pointy ? Math.pow(Math.abs(s), 3) * 1.4 : Math.abs(s)) * amp);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function brick(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, th: Theme, top: boolean) {
  ctx.fillStyle = th.brick;
  ctx.fillRect(x, y, s + 0.5, s + 0.5);
  ctx.strokeStyle = th.mortar;
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
    ctx.fillStyle = th.top;
    ctx.fillRect(x, y, s + 0.5, s * 0.2);
    if (th.glow) {
      ctx.fillStyle = th.glow;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, y, s + 0.5, s * 0.06);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "#3a8f3a";
      for (let i = 0; i < 4; i++) ctx.fillRect(x + (i * s) / 4 + s * 0.06, y + s * 0.18, s * 0.08, s * 0.1);
    }
  }
}

function rubber(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.fillStyle = "#2f7fd6";
  rr(ctx, x + 1, y + 1, s - 2, s - 2, s * 0.2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(x + s * 0.18, y + s * 0.16 + Math.sin(t * 6) * 1.5, s * 0.64, s * 0.12);
  label(ctx, "⇡", x + s / 2, y + s * 0.6, s * 0.5, "#fff");
}

function spikes(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, down: boolean) {
  ctx.fillStyle = "#9aa3b2";
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

function lava(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, tx: number, top: boolean) {
  const g = ctx.createLinearGradient(0, y, 0, y + s);
  g.addColorStop(0, "#ff8a1a");
  g.addColorStop(1, "#c3260e");
  ctx.fillStyle = g;
  ctx.fillRect(x, y + (top ? s * 0.15 + Math.sin(t * 3 + tx) * s * 0.05 : 0), s + 1, s + 1);
  if (top) {
    ctx.fillStyle = "#ffd24a";
    const bx = x + ((tx * 37 + t * 20) % s);
    ctx.beginPath();
    ctx.arc(bx, y + s * 0.25, Math.max(0.5, s * 0.08 * (1 + Math.sin(t * 5 + tx))), 0, Math.PI * 2);
    ctx.fill();
  }
}

function gate(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, open: boolean, top: boolean, t: number) {
  if (open) {
    const glow = 0.6 + Math.sin(t * 4) * 0.2;
    ctx.fillStyle = `rgba(255,236,150,${glow})`;
    ctx.fillRect(x + s * 0.1, y, s * 0.8, s);
    if (top) label(ctx, "★", x + s / 2, y + s * 0.45, s * 0.5, "#f2b31b");
  } else {
    ctx.fillStyle = "#7a5a1e";
    ctx.fillRect(x + s * 0.05, y, s * 0.9, s);
    ctx.fillStyle = "#d4a02a";
    for (let i = 0; i < 3; i++) ctx.fillRect(x + s * (0.18 + i * 0.27), y, s * 0.1, s);
  }
}

function qblock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, power: boolean) {
  ctx.fillStyle = power ? "#9b5bd6" : "#f2b31b";
  rr(ctx, x + 1, y + 1, s - 2, s - 2, s * 0.14);
  ctx.fill();
  ctx.strokeStyle = power ? "#5d2f8a" : "#a06b0a";
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.stroke();
  label(ctx, power ? "★" : "?", x + s / 2, y + s / 2 + Math.sin(t * 4) * s * 0.04, s * 0.62, "#fffaf0");
}

function usedBlock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "#8a6a44";
  rr(ctx, x + 1, y + 1, s - 2, s - 2, s * 0.14);
  ctx.fill();
  ctx.fillStyle = "#6a4e30";
  for (const [dx, dy] of [
    [0.22, 0.22],
    [0.78, 0.22],
    [0.22, 0.78],
    [0.78, 0.78],
  ] as const)
    ctx.fillRect(x + s * dx - 1.5, y + s * dy - 1.5, 3, 3);
}

function crumble(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, shaking: boolean) {
  ctx.fillStyle = shaking ? "#d9a35b" : "#c98f48";
  ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
  ctx.strokeStyle = "#7a4f1e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.2, y + 2);
  ctx.lineTo(x + s * 0.45, y + s * 0.5);
  ctx.lineTo(x + s * 0.3, y + s - 2);
  ctx.moveTo(x + s * 0.45, y + s * 0.5);
  ctx.lineTo(x + s * 0.85, y + s * 0.4);
  ctx.stroke();
}

function cannon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: number) {
  ctx.fillStyle = "#3b3b48";
  rr(ctx, x + 2, y + s * 0.3, s - 4, s * 0.7, s * 0.12);
  ctx.fill();
  ctx.fillStyle = "#23232c";
  rr(ctx, dir < 0 ? x : x + s * 0.55, y + s * 0.15, s * 0.45, s * 0.45, s * 0.1);
  ctx.fill();
  ctx.fillStyle = "#e2483f";
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s * 0.68, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function plank(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, world: number) {
  ctx.fillStyle = world === 3 ? "#5a4a44" : world === 2 ? "#6c7aa0" : "#a06a35";
  rr(ctx, x, y, w, h + 4, 5);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + 4, y + 2, w - 8, 3);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (w * i) / 3, y + 2);
    ctx.lineTo(x + (w * i) / 3, y + h + 2);
    ctx.stroke();
  }
}

function gem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#2bd0e0";
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.8, y - r * 0.2);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.8, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.3, y - r * 0.2);
  ctx.lineTo(x - r * 0.3, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
}

function powerItem(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, s: number, t: number) {
  const r = s * 0.36;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(x, y, r * 1.35 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
  ctx.fill();
  if (kind === "U") {
    ctx.fillStyle = "#3a86e8";
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.85, y - r * 0.6);
    ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.6, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.6, x - r * 0.85, y - r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - r * 0.1, y - r * 0.55, r * 0.2, r * 1.1);
    ctx.fillRect(x - r * 0.45, y - r * 0.15, r * 0.9, r * 0.2);
  } else if (kind === "F") {
    ctx.fillStyle = "#e2312a";
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.1, r * 0.5, r * 0.95, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3fb661";
    ctx.fillRect(x + r * 0.2, y - r * 1.05, r * 0.25, r * 0.45);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.15, y - r * 0.15, r * 0.12, r * 0.35, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "W") {
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#8fb7d9";
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + side * r * 0.45, y, r * 0.55, r * 0.32, side * -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === "T") {
    ctx.fillStyle = `hsl(${(t * 300) % 360} 90% 60%)`;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
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
    const rad = i % 2 ? r * 0.6 : r * 1.05;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
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

function fireball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 1.3);
  g.addColorStop(0, "#fff6b0");
  g.addColorStop(0.45, "#ffb02e");
  g.addColorStop(1, "rgba(226,49,42,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * (1.3 + Math.sin(t * 20) * 0.1), 0, Math.PI * 2);
  ctx.fill();
}

function bug(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, vx: number) {
  const stepOff = Math.sin(t * 14) * r * 0.15;
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  for (const dx of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * r, y + r * 0.3);
    ctx.lineTo(x + dx * r + stepOff * (dx === 0 ? -1 : 1), y + r);
    ctx.stroke();
  }
  ctx.fillStyle = "#7b3fbf";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.3, r, r * 1.05, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b07ce8";
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.18, 0, Math.PI * 2);
  ctx.arc(x + r * 0.25, y - r * 0.45, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  const d = Math.sign(vx || 1);
  const ex = x + d * r * 0.55;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ex, y - r * 0.05, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(ex + d * r * 0.06, y - r * 0.05, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

function stone(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, falling: boolean, t: number) {
  const wob = falling ? 0 : Math.sin(t * 2 + x) * 0.5;
  ctx.fillStyle = "#8b8f9c";
  ctx.beginPath();
  ctx.moveTo(x - r * 1.1, y - r * 1.2);
  ctx.lineTo(x + r * 1.1, y - r * 1.2);
  ctx.lineTo(x + wob, y + r * 1.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y - r);
  ctx.lineTo(x - r * 0.2, y - r);
  ctx.lineTo(x - r * 0.1, y + r * 0.4);
  ctx.closePath();
  ctx.fill();
}

function bullet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, vx: number) {
  ctx.fillStyle = "rgba(255,160,60,0.6)";
  ctx.beginPath();
  ctx.arc(x - Math.sign(vx) * r * 1.3, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#23232c";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(x - Math.sign(vx) * r * 0.3, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "#e2483f";
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.8);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.4, y - s * 0.2, x, y + s * 0.8);
  ctx.fill();
}

function drawBoss(ctx: CanvasRenderingContext2D, k: NonNullable<World["boss"]>, x: number, y: number, tile: number, t: number) {
  if (k.hurt > 0 && Math.floor(t * 16) % 2 === 0) return;
  const w = k.w * tile;
  const h = k.h * tile;
  const body = k.level === 1 ? "#5a8f2e" : k.level === 2 ? "#5b6fd6" : "#c2361f";
  const belly = k.level === 1 ? "#a6d36a" : k.level === 2 ? "#a9e4f5" : "#ffb347";
  const squash = k.onGround ? 1 : 0.92;
  ctx.save();
  ctx.translate(x, y + h / 2);
  ctx.scale(1 / squash, squash);
  const spikeLen = k.level >= 3 ? (k.spikes ? 0.6 : 0.15) : 0.3;
  ctx.fillStyle = k.spikes ? "#ffe08a" : "#2d3748";
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const bx = Math.cos(a) * w * 0.45;
    const by = -h * 0.5 + Math.sin(a) * h * 0.45;
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.06, by + h * 0.04);
    ctx.lineTo(bx + Math.cos(a) * w * spikeLen * 0.4, by + Math.sin(a) * h * spikeLen * 0.4 - h * 0.02);
    ctx.lineTo(bx + w * 0.06, by + h * 0.04);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.5, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.3, w * 0.3, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2c230";
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, -h * 0.92);
  ctx.lineTo(-w * 0.2, -h * 1.12);
  ctx.lineTo(-w * 0.1, -h * 1.0);
  ctx.lineTo(0, -h * 1.15);
  ctx.lineTo(w * 0.1, -h * 1.0);
  ctx.lineTo(w * 0.2, -h * 1.12);
  ctx.lineTo(w * 0.2, -h * 0.92);
  ctx.closePath();
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(side * w * 0.17, -h * 0.62, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(side * w * 0.15, -h * 0.6, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = Math.max(2, w * 0.035);
    ctx.beginPath();
    ctx.moveTo(side * w * 0.28, -h * 0.78);
    ctx.lineTo(side * w * 0.07, -h * 0.7);
    ctx.stroke();
  }
  ctx.fillStyle = "#3a0d0d";
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.36, w * 0.16, h * (0.06 + Math.abs(Math.sin(t * 3)) * 0.05), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  for (const tx of [-0.08, 0.08]) {
    ctx.beginPath();
    ctx.moveTo(w * tx - w * 0.03, -h * 0.4);
    ctx.lineTo(w * tx + w * 0.03, -h * 0.4);
    ctx.lineTo(w * tx, -h * 0.33);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, w: World, px: number, py: number, tile: number, t: number) {
  const b = w.ball;
  if (b.hurt > 0 && Math.floor(t * 14) % 2 === 0) return;
  const r = b.r * tile;
  const x = px + (b.hurt > HURT_TIME - 0.6 ? Math.sin(t * 60) * r * 0.15 : 0);
  const y = py;
  if (b.wings) {
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#8fb7d9";
    ctx.lineWidth = 1.5;
    const flap = Math.sin(t * (b.onGround ? 4 : 18)) * 0.4;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(x + side * r * 0.85, y - r * 0.2);
      ctx.rotate(side * (-0.5 + flap));
      ctx.beginPath();
      ctx.ellipse(side * r * 0.35, 0, r * 0.5, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  if (b.star > 0) {
    const hue = (t * 400) % 360;
    grad.addColorStop(0, `hsl(${hue} 100% 85%)`);
    grad.addColorStop(1, `hsl(${(hue + 60) % 360} 90% 50%)`);
  } else if (b.fire) {
    grad.addColorStop(0, "#ffd08a");
    grad.addColorStop(1, "#e2560f");
  } else {
    grad.addColorStop(0, "#ff8f7a");
    grad.addColorStop(1, b.r >= BIG_R ? "#b8241c" : "#d8322a");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(90,10,10,0.35)";
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.7, b.spin, b.spin + Math.PI * 0.5);
  ctx.stroke();
  const f = b.face;
  for (const ex of [0.05, 0.42]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(x + f * r * ex, y - r * 0.22, r * 0.17, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b1b1b";
    ctx.beginPath();
    ctx.arc(x + f * r * (ex + 0.06), y - r * 0.2, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  if (b.mouth > 0) {
    ctx.fillStyle = "#5a0d0d";
    ctx.beginPath();
    ctx.ellipse(x + f * r * 0.45, y + r * 0.28, r * 0.2, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "#5a0d0d";
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.beginPath();
    ctx.arc(x + f * r * 0.25, y + r * 0.12, r * 0.2, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(x - f * r * 0.4, y - r * 0.5, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  if (b.fire) {
    ctx.fillStyle = `rgba(255,140,40,${0.5 + Math.sin(t * 20) * 0.2})`;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.5;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95 - Math.abs(Math.sin(t * 12 + i)) * r * 0.2, r * 0.12, r * 0.25, a + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (b.shield) {
    ctx.strokeStyle = `rgba(90,170,255,${0.55 + Math.sin(t * 5) * 0.2})`;
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.beginPath();
    ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(120,190,255,0.12)";
    ctx.fill();
  }
}
