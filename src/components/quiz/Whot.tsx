import { useCallback, useEffect, useRef, useState } from "react";
import { LEVEL_NAMES, loadLevel, saveLevel, type ArcadeLevel } from "@/lib/quiz/arcade";
import { sfx } from "@/lib/quiz/sfx";
import { useQuiz } from "@/lib/quiz/store";
import { SHAPES, SPECIAL, aiMove, canPlay, goMarket, newWhot, play, top, type Card, type Shape, type Whot as WhotGame } from "@/lib/quiz/whot";
import { GameStage } from "@/components/quiz/GameStage";
import { LevelChoice, NoTickets, TicketCount, TicketHint, useTicket } from "@/components/quiz/FunGameKit";

const RIVALS = [
  { name: "Ada", face: "👧🏾" },
  { name: "Tunde", face: "👦🏿" },
  { name: "Chioma", face: "👩🏾" },
];

const BLURBS: Record<ArcadeLevel, string> = {
  easy: "The computer plays any card it can",
  medium: "The computer uses its special cards",
  hard: "The computer plans ahead and attacks when you're close",
  expert: "The computer plays its best every time",
};

const COINS: Record<ArcadeLevel, number> = { easy: 15, medium: 25, hard: 40, expert: 60 };

type Phase = "setup" | "playing" | "over";

export function Whot() {
  const age = useQuiz((s) => s.age);
  const myName = useQuiz((s) => s.name) || "You";
  const park = useQuiz((s) => s.park);
  const arcadeReward = useQuiz((s) => s.arcadeReward);
  const wins = useQuiz((s) => s.arcadeBest["whot-wins"] ?? 0);
  const ticket = useTicket();
  const [level, setLevel] = useState<ArcadeLevel>(() => loadLevel("whot", age));
  const [rivals, setRivals] = useState(1);
  const [defend, setDefend] = useState(false);
  const [phase, setPhase] = useState<Phase>("setup");
  const [noTicket, setNoTicket] = useState(false);
  const gameRef = useRef<WhotGame | null>(null);
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [asking, setAsking] = useState<number | null>(null);
  const [coins, setCoins] = useState(0);
  const [flash, setFlash] = useState<string>("");
  const levelRef = useRef(level);
  levelRef.current = level;

  const g = gameRef.current;

  const announce = useCallback((text: string) => {
    setFlash(text);
    window.setTimeout(() => setFlash((f) => (f === text ? "" : f)), 1400);
  }, []);

  const checkEnd = useCallback(() => {
    const game = gameRef.current;
    if (!game || game.winner === null) return false;
    const iWon = game.winner === 0;
    const earned = iWon ? COINS[levelRef.current] * (game.players.length - 1) : 3;
    const total = (useQuiz.getState().arcadeBest["whot-wins"] ?? 0) + (iWon ? 1 : 0);
    arcadeReward("whot-wins", total, 0);
    arcadeReward("whot", total, earned);
    setCoins(earned);
    if (iWon) sfx.win();
    else sfx.gameOver();
    window.setTimeout(() => setPhase("over"), 900);
    return true;
  }, [arcadeReward]);

  function start() {
    if (!ticket.spend()) {
      setNoTicket(true);
      return;
    }
    setNoTicket(false);
    gameRef.current = newWhot([myName, ...RIVALS.slice(0, rivals).map((r) => r.name)], { defend });
    setAsking(null);
    setPhase("playing");
    sfx.start();
    bump();
  }

  function chooseLevel(l: ArcadeLevel) {
    setLevel(l);
    saveLevel("whot", l);
  }

  /* ---------- the computer's turns ---------- */
  useEffect(() => {
    const game = gameRef.current;
    if (phase !== "playing" || !game || game.winner !== null || game.turn === 0) return;
    const id = window.setTimeout(() => {
      const m = aiMove(game, levelRef.current);
      const who = game.players[game.turn]!.name;
      if (m.kind === "market") {
        goMarket(game);
        sfx.draw();
      } else {
        const card = game.players[game.turn]!.hand.find((c) => c.id === m.cardId);
        play(game, m.cardId, m.ask);
        sfx.card();
        if (card && card.n in SPECIAL) announce(card.shape === "whot" ? `${who}: "I need ${m.ask}!"` : `${who}: ${SPECIAL[card.n]}!`);
      }
      checkEnd();
      bump();
    }, 850);
    return () => window.clearTimeout(id);
  });

  function playCard(card: Card, ask?: Exclude<Shape, "whot">) {
    const game = gameRef.current;
    if (!game || game.turn !== 0 || game.winner !== null) return;
    if (!canPlay(game, card)) {
      sfx.wrong();
      announce(game.pending ? `You must pick ${game.pending} (tap Market)` : game.called ? `Play a ${game.called} or WHOT` : "That card doesn't match");
      return;
    }
    if (card.shape === "whot" && !ask) {
      setAsking(card.id);
      return;
    }
    const r = play(game, card.id, ask);
    setAsking(null);
    if (!r.ok) return;
    sfx.card();
    if (card.n in SPECIAL && card.shape !== "whot") announce(`${SPECIAL[card.n]}!`);
    if (r.again && game.winner === null) announce(card.n === 14 ? "General market! Play again" : "Hold on! Play again");
    checkEnd();
    bump();
  }

  function market() {
    const game = gameRef.current;
    if (!game || game.turn !== 0 || game.winner !== null) return;
    goMarket(game);
    sfx.draw();
    checkEnd();
    bump();
  }

  const myTurn = !!g && g.turn === 0 && g.winner === null && phase === "playing";
  const hand = g ? [...g.players[0]!.hand].sort((a, b) => SHAPES.indexOf(a.shape as never) - SHAPES.indexOf(b.shape as never) || a.n - b.n) : [];
  const status = !g
    ? ""
    : g.winner !== null
      ? g.winner === 0
        ? "You win! 🎉"
        : `${g.players[g.winner]!.name} wins`
      : myTurn
        ? g.pending
          ? `Pick ${g.pending}! Tap Market${g.defend ? ` or defend with a ${g.pendingBy}` : ""}`
          : "Your turn"
        : `${g.players[g.turn]!.name} is thinking…`;

  return (
    <GameStage title="WHOT!" onBack={() => park("map")} stats={<TicketCount />}>
      {phase === "setup" || !g ? (
        <div className="whot-setup">
          <div className="whot-hero">
            <WhotCard card={{ id: -1, shape: "whot", n: 20 }} />
            <WhotCard card={{ id: -2, shape: "star", n: 5 }} />
            <WhotCard card={{ id: -3, shape: "circle", n: 2 }} />
          </div>
          <h3 className="mt-3 font-display text-3xl font-semibold">WHOT!</h3>
          <p className="text-sm text-muted">Match the shape or number. First to finish their cards wins.</p>
          <ul className="whot-rules">
            <li><b>1</b> Hold On · play again</li>
            <li><b>2</b> Pick Two</li>
            <li><b>5</b> Pick Three</li>
            <li><b>8</b> Suspension · next player misses</li>
            <li><b>14</b> General Market · everyone picks 1</li>
            <li><b>20</b> WHOT · ask for any shape</li>
          </ul>
          <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-gold">Players</p>
          <div className="arcade-levels mt-1" role="radiogroup" aria-label="How many computer players">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rivals === n} className={rivals === n ? "is-active" : ""} onClick={() => setRivals(n)}>
                You + {n}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-gold">How clever is the computer?</p>
          <div className="mt-1">
            <LevelChoice level={level} onChange={chooseLevel} blurb={BLURBS[level]} />
          </div>
          <label className="whot-toggle mt-3">
            <input type="checkbox" checked={defend} onChange={(e) => setDefend(e.target.checked)} />
            <span>Defend rule: block a Pick Two with a 2 (and Pick Three with a 5)</span>
          </label>
          {noTicket ? (
            <NoTickets />
          ) : (
            <>
              <button type="button" onClick={start} className="mt-4 min-h-12 w-full rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                Deal the cards
              </button>
              <TicketHint />
            </>
          )}
          <p className="mt-2 text-xs font-bold text-muted">Games won: {wins}</p>
        </div>
      ) : (
        <div className="whot-table">
          <div className="whot-rivals">
            {g.players.slice(1).map((p, i) => (
              <div key={p.name} className={g.turn === i + 1 && g.winner === null ? "whot-rival is-turn" : "whot-rival"}>
                <span className="text-2xl" aria-hidden>
                  {RIVALS[i]!.face}
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-sm">{p.name}</b>
                  <span className="text-xs font-bold text-muted">
                    {p.hand.length} {p.hand.length === 1 ? "card" : "cards"}
                  </span>
                </span>
                <span className="whot-backs" aria-hidden>
                  {Array.from({ length: Math.min(p.hand.length, 8) }, (_, k) => (
                    <i key={k} />
                  ))}
                </span>
                {p.hand.length === 1 && g.winner === null ? <span className="whot-last">Last card!</span> : null}
              </div>
            ))}
          </div>

          <div className="whot-center">
            <button type="button" className={myTurn ? "whot-market is-live" : "whot-market"} onClick={market} disabled={!myTurn} aria-label={`Market, ${g.market.length} cards. Tap to pick`}>
              <WhotBack />
              <span className="whot-market-label">
                Market
                <small>{g.market.length} left</small>
              </span>
            </button>
            <div className="whot-pile" aria-live="polite" aria-label={`Top card: ${top(g).shape} ${top(g).n}${g.called ? `. Asking for ${g.called}` : ""}`}>
              <WhotCard key={top(g).id} card={top(g)} big />
              {g.called ? (
                <span className="whot-called">
                  I need <ShapeIcon shape={g.called} />
                </span>
              ) : null}
            </div>
          </div>

          <p className={myTurn ? "whot-status is-mine" : "whot-status"} role="status">
            {flash || status}
          </p>
          <p className="whot-log">{g.log.slice(-2).join(" · ")}</p>

          <div className="whot-hand" aria-label="Your cards">
            {hand.map((c) => {
              const ok = myTurn && canPlay(g, c);
              return (
                <button key={c.id} type="button" className={ok ? "whot-hand-card is-ok" : "whot-hand-card"} onClick={() => playCard(c)} aria-label={`${c.shape === "whot" ? "WHOT 20" : `${c.shape} ${c.n}`}${ok ? ", can play" : ""}`}>
                  <WhotCard card={c} />
                </button>
              );
            })}
          </div>

          {asking !== null && (
            <div className="snake-overlay" role="dialog" aria-label="Ask for a shape">
              <div className="snake-card">
                <p className="font-display text-2xl font-semibold">I need…</p>
                <div className="whot-shapes mt-3">
                  {SHAPES.map((s) => (
                    <button key={s} type="button" onClick={() => playCard(hand.find((c) => c.id === asking)!, s)} aria-label={s}>
                      <ShapeIcon shape={s} />
                      <small>{s}</small>
                    </button>
                  ))}
                </div>
                <button type="button" className="mt-3 text-sm font-bold text-muted underline" onClick={() => setAsking(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {phase === "over" && (
            <div className="snake-overlay" role="status">
              <div className="snake-card">
                <p className="font-display text-3xl font-semibold">{g.winner === 0 ? "You win! 🎉" : `${g.players[g.winner ?? 1]!.name} wins`}</p>
                {g.countedOut ? <p className="mt-1 text-sm">The market finished, so the cards were counted. Lowest total wins.</p> : null}
                <p className="mt-1 font-extrabold">+{coins} coins · games won: {wins}</p>
                <p className="text-xs font-bold text-muted">{LEVEL_NAMES[level]} computer</p>
                {noTicket ? (
                  <NoTickets />
                ) : (
                  <>
                    <button type="button" onClick={start} className="mt-3 min-h-12 rounded-2xl bg-primary px-8 font-extrabold text-primary-fg">
                      Play again
                    </button>
                    <TicketHint />
                  </>
                )}
                <button type="button" className="mt-2 block text-sm font-bold text-muted underline" onClick={() => setPhase("setup")}>
                  Change players or level
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </GameStage>
  );
}

const INK = "#8f1d2c";

export function ShapeIcon({ shape, size = 22 }: { shape: Shape; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <ShapePath shape={shape} cx={50} cy={50} r={38} />
    </svg>
  );
}

function ShapePath({ shape, cx, cy, r }: { shape: Shape; cx: number; cy: number; r: number }) {
  if (shape === "circle") return <circle cx={cx} cy={cy} r={r * 0.85} fill={INK} />;
  if (shape === "triangle") return <polygon points={`${cx},${cy - r} ${cx + r},${cy + r * 0.8} ${cx - r},${cy + r * 0.8}`} fill={INK} />;
  if (shape === "square") return <rect x={cx - r * 0.78} y={cy - r * 0.78} width={r * 1.56} height={r * 1.56} fill={INK} />;
  if (shape === "cross")
    return (
      <g fill={INK}>
        <rect x={cx - r * 0.28} y={cy - r} width={r * 0.56} height={r * 2} />
        <rect x={cx - r} y={cy - r * 0.28} width={r * 2} height={r * 0.56} />
      </g>
    );
  if (shape === "star") {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.42 : r;
      pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
    }
    return <polygon points={pts.join(" ")} fill={INK} />;
  }
  return (
    <text x={cx} y={cy + r * 0.25} textAnchor="middle" fontSize={r * 0.75} fontWeight={900} fill={INK} fontFamily="Nunito, system-ui, sans-serif">
      WHOT
    </text>
  );
}

export function WhotCard({ card, big = false }: { card: Card; big?: boolean }) {
  const special = card.n in SPECIAL;
  return (
    <svg viewBox="0 0 100 140" className={big ? "whot-card is-big" : "whot-card"} aria-hidden>
      <rect x="2" y="2" width="96" height="136" rx="10" fill="#fffaf0" stroke={INK} strokeWidth="3" />
      <text x="10" y="24" fontSize="20" fontWeight={900} fill={INK} fontFamily="Nunito, system-ui, sans-serif">
        {card.n}
      </text>
      <g transform="rotate(180 50 70)">
        <text x="10" y="24" fontSize="20" fontWeight={900} fill={INK} fontFamily="Nunito, system-ui, sans-serif">
          {card.n}
        </text>
      </g>
      {card.shape !== "whot" ? <ShapePath shape={card.shape} cx={50} cy={70} r={card.shape === "star" ? 30 : 26} /> : <ShapePath shape="whot" cx={50} cy={74} r={44} />}
      {special && card.shape !== "whot" ? (
        <text x="50" y="124" textAnchor="middle" fontSize="10" fontWeight={800} fill={INK} fontFamily="Nunito, system-ui, sans-serif">
          {SPECIAL[card.n]}
        </text>
      ) : null}
    </svg>
  );
}

function WhotBack() {
  return (
    <svg viewBox="0 0 100 140" className="whot-card" aria-hidden>
      <rect x="2" y="2" width="96" height="136" rx="10" fill={INK} stroke="#5d0f1a" strokeWidth="3" />
      <rect x="10" y="10" width="80" height="120" rx="7" fill="none" stroke="#f3c9a0" strokeWidth="2" strokeDasharray="4 4" />
      <text x="50" y="78" textAnchor="middle" fontSize="22" fontWeight={900} fill="#fffaf0" fontFamily="Nunito, system-ui, sans-serif" transform="rotate(-30 50 70)">
        WHOT
      </text>
    </svg>
  );
}
