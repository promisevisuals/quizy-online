import { useEffect, useMemo, useRef, useState } from "react";
import { Download, MessageCircle, Share2, Trophy } from "lucide-react";
import { recordActivity, useQuizSession } from "@/lib/quiz/cloud";
import { WEEKLY_COUNT, daysUntilNextWeek, weekKey, type Age } from "@/lib/quiz/logic";
import { useQuiz, type WeeklyResult } from "@/lib/quiz/store";
import { APP, IS_KINGS } from "@/lib/app";

export const QUIZY_SITE = APP.siteUrl;
const AGE_LABEL: Record<Age, string> = { young: "Ages 5–7", old: "Ages 8–10" };

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function weekLabel(week: string) {
  return `Week ${Number(week.split("-W")[1] ?? 0)}`;
}

function verdict(correct: number, total: number) {
  const r = correct / Math.max(1, total);
  if (r === 1) return "Perfect score!";
  if (r >= 0.8) return "Brilliant explorer!";
  if (r >= 0.6) return "Great trail work!";
  if (r >= 0.4) return "Good effort!";
  return "Brave try!";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Draws the shareable score card (1080 × 1350, good for WhatsApp Status and Instagram). */
export async function drawScoreCard(result: WeeklyResult, name: string) {
  const w = 1080;
  const h = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Images are not supported on this device.");
  const display = "'Baloo 2', 'Nunito', Arial, sans-serif";
  const sans = "'Nunito', Arial, sans-serif";
  try {
    await Promise.all([document.fonts.load(`700 120px 'Baloo 2'`), document.fonts.load(`800 40px 'Nunito'`)]);
  } catch {
    /* system fonts are fine */
  }

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#1c7a4a");
  bg.addColorStop(1, "#163024");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // Soft leaves of light in the corners.
  for (const [x, y, r, a] of [
    [80, 120, 260, 0.12],
    [1000, 260, 300, 0.1],
    [140, 1240, 320, 0.1],
  ] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,214,120,${a})`);
    g.addColorStop(1, "rgba(255,214,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  const cardX = 70;
  const cardY = 210;
  const cardW = w - 140;
  const cardH = 900;
  ctx.fillStyle = "#fff8ea";
  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fill();
  ctx.strokeStyle = "#d4920b";
  ctx.lineWidth = 8;
  ctx.stroke();

  const mark = await loadImage("/quizy-mark.png");
  ctx.textAlign = "center";
  if (mark) {
    const size = 150;
    ctx.drawImage(mark, w / 2 - size / 2, 40, size, size);
  } else {
    ctx.fillStyle = "#fffaf1";
    ctx.font = `700 110px ${display}`;
    ctx.fillText(APP.name, w / 2, 160);
  }

  ctx.fillStyle = "#d4920b";
  ctx.font = `800 40px ${sans}`;
  ctx.fillText(`WEEKLY CHALLENGE · ${weekLabel(result.week).toUpperCase()}`, w / 2, cardY + 100);

  ctx.fillStyle = "#2a2416";
  ctx.font = `700 70px ${display}`;
  ctx.fillText(name ? `${name} scored` : "I scored", w / 2, cardY + 210);

  ctx.fillStyle = "#1c7a4a";
  ctx.font = `700 260px ${display}`;
  ctx.fillText(`${result.correct}/${result.total}`, w / 2, cardY + 450);

  // A star for every question, gold when right.
  const gap = 84;
  const startX = w / 2 - ((result.total - 1) * gap) / 2;
  for (let i = 0; i < result.total; i++) {
    star(ctx, startX + i * gap, cardY + 540, 34);
    ctx.fillStyle = i < result.correct ? "#d4920b" : "#e4cfa3";
    ctx.fill();
  }

  ctx.fillStyle = "#2a2416";
  ctx.font = `700 64px ${display}`;
  ctx.fillText(verdict(result.correct, result.total), w / 2, cardY + 680);
  ctx.fillStyle = "#6d5c43";
  ctx.font = `700 38px ${sans}`;
  ctx.fillText(`in ${clock(result.seconds)} · ${AGE_LABEL[result.age]}`, w / 2, cardY + 750);

  ctx.fillStyle = "#1c7a4a";
  roundRect(ctx, cardX + 120, cardY + 790, cardW - 240, 80, 40);
  ctx.fill();
  ctx.fillStyle = "#fffaf1";
  ctx.font = `800 38px ${sans}`;
  ctx.fillText("Can you beat this score?", w / 2, cardY + 843);

  ctx.fillStyle = "#fffaf1";
  ctx.font = `700 54px ${display}`;
  ctx.fillText("Play free this week", w / 2, cardY + cardH + 95);
  ctx.fillStyle = "#ffd678";
  ctx.font = `800 44px ${sans}`;
  ctx.fillText(QUIZY_SITE.replace("https://", ""), w / 2, cardY + cardH + 160);
  ctx.fillStyle = "rgba(255,250,241,0.7)";
  ctx.font = `700 26px ${sans}`;
  ctx.fillText("by PROMISEVISUALS", w / 2, h - 40);
  return canvas;
}

export function Weekly() {
  const weekly = useQuiz((s) => s.weekly);
  const name = useQuiz((s) => s.name);
  const age = useQuiz((s) => s.age);
  const setAge = useQuiz((s) => s.setAge);
  const setName = useQuiz((s) => s.setName);
  const startWeekly = useQuiz((s) => s.startWeekly);
  const go = useQuiz((s) => s.go);
  const round = useQuiz((s) => s.round);
  const week = weekKey();
  const done = weekly?.week === week ? weekly : null;
  const inProgress = round?.mode === "weekly";
  const left = daysUntilNextWeek();

  return (
    <section className="mx-auto max-w-xl">
      <p className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-gold">
        <Trophy className="size-4" aria-hidden />
        {weekLabel(week)}
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold">Weekly challenge</h2>
      {done ? (
        <ScoreCard result={done} name={name} />
      ) : (
        <>
          <p className="mt-2 leading-relaxed text-muted">
            Ten questions, easy to tricky. Every explorer in your age group gets the same ten this week, so you can compare
            scores with friends. One go each week — no hints, and the clock is running.
          </p>
          {!name.trim() && (
            <label className="mt-4 block text-sm font-bold">
              Explorer name
              <input
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 24))}
                placeholder="Your first name"
                className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-surface px-3 font-bold text-fg"
              />
            </label>
          )}
          {!inProgress && (
            <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Age group">
              {(["young", "old"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={age === id}
                  onClick={() => setAge(id)}
                  className={`min-h-11 rounded-2xl border font-extrabold ${age === id ? "border-gold bg-surface" : "border-line"}`}
                >
                  {AGE_LABEL[id]}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={startWeekly}
            className="mt-6 min-h-12 w-full rounded-2xl bg-primary font-extrabold text-primary-fg"
          >
            {inProgress ? "Carry on this week's challenge" : "Start this week's challenge"}
          </button>
          <p className="mt-3 text-sm text-muted">
            New questions in {left} {left === 1 ? "day" : "days"} (every Monday).
          </p>
        </>
      )}
      <button type="button" onClick={() => go("map")} className="mt-3 min-h-12 w-full rounded-2xl border border-line font-extrabold">
        Back to the trail
      </button>
    </section>
  );
}

function ScoreCard({ result, name }: { result: WeeklyResult; name: string }) {
  const [showName, setShowName] = useState(false);
  const [image, setImage] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useQuizSession();
  const logged = useRef(false);
  const shownName = showName ? name.trim().split(/\s+/)[0]?.slice(0, 16) ?? "" : "";
  const left = daysUntilNextWeek();

  useEffect(() => {
    let live = true;
    drawScoreCard(result, shownName)
      .then((canvas) => {
        if (live) setImage(canvas.toDataURL("image/png"));
      })
      .catch(() => setImage(""));
    return () => {
      live = false;
    };
  }, [result, shownName]);

  // Signed-in explorers: note the finished challenge for the Command Center.
  useEffect(() => {
    if (!user || logged.current || Date.now() - result.at > 60000) return;
    logged.current = true;
    void recordActivity(user.id, "weekly_challenge", { week: result.week, age: result.age, correct: result.correct, total: result.total, seconds: result.seconds }).catch(() => undefined);
  }, [user, result]);

  const text = useMemo(
    () => `🏆 I scored ${result.correct}/${result.total} on this week's ${APP.name} challenge in ${clock(result.seconds)}! Can you beat it? Play free: ${QUIZY_SITE}/?weekly=1`,
    [result],
  );
  const fileName = `quizy-${result.week.toLowerCase()}-${result.correct}of${result.total}.png`;

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function share() {
    if (!image) return;
    setBusy(true);
    setNote("");
    try {
      const blob = await (await fetch(image)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: `${APP.name} weekly challenge` });
      } else if (navigator.share) {
        await navigator.share({ text, title: `${APP.name} weekly challenge` });
      } else {
        download();
        setNote("Card saved. Share it from your photos.");
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setNote("Sharing isn't available here. Download the card instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-card border border-gold bg-surface">
        {image ? (
          <img src={image} alt={`Score card: ${result.correct} out of ${result.total}`} className="block h-auto w-full" />
        ) : (
          <div className="grid aspect-[4/5] place-items-center text-muted">Drawing your card…</div>
        )}
      </div>
      {name.trim() && (
        <label className="mt-3 flex items-center gap-3 text-sm font-bold">
          <input type="checkbox" checked={showName} onChange={(event) => setShowName(event.target.checked)} className="size-5 accent-[var(--color-primary)]" />
          Put my first name on the card
        </label>
      )}
      <button
        type="button"
        onClick={share}
        disabled={!image || busy}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold font-extrabold text-gold-fg disabled:opacity-50"
      >
        <Share2 className="size-4" aria-hidden />
        Share my score card
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-extrabold"
        >
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </a>
        <button
          type="button"
          onClick={download}
          disabled={!image}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-extrabold disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden />
          Download
        </button>
      </div>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
      <p className="mt-3 text-sm text-muted">
        Done for {weekLabel(result.week).toLowerCase()}. New questions in {left} {left === 1 ? "day" : "days"}. Grown-ups: ask before sharing a child&apos;s name online.
      </p>
    </div>
  );
}
