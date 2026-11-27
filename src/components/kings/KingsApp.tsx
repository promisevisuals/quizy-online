/**
 * King's Bible Quest: its own storybook look, built on the shared quiz engine (store + logic).
 * Screens here: opening, welcome, home (journey, challenges, games, more), question, break, results, shop.
 * Rarer screens (weekly card, online battle, command center, the fun games) reuse the shared components.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpenText,
  CircleHelp,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Heart,
  Lightbulb,
  Lock,
  Medal,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Ticket,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { useQuiz } from "@/lib/quiz/store";
import { ADVANCED_MODES, lands, speak, stopSpeak, todayKey, weekKey, type Age, type Difficulty, type PlayItem } from "@/lib/quiz/logic";
import { signOut, trackVisit, useQuizSession, type PublicFlags } from "@/lib/quiz/cloud";
import { CloudSync } from "@/components/quiz/CloudSync";
import { HelpMap } from "@/components/quiz/HelpMap";
import { ShareQuizyButton } from "@/components/quiz/ShareQuizy";
import { BattleRoom } from "@/components/quiz/BattleRoom";
import { CommandCenter } from "@/components/quiz/CommandCenter";
import { Weekly } from "@/components/quiz/WeeklyChallenge";
import { Bricks } from "@/components/quiz/Bricks";
import { Whot } from "@/components/quiz/Whot";
import { Match3 } from "@/components/quiz/Match3";
import { Bounce } from "@/components/quiz/Bounce";
import { QuickFeedback } from "@/components/quiz/QuickFeedback";
import { Certificate, Duel, Inbox, InstallButton } from "@/components/quiz/QuizApp";
import { FUN_GAMES, gameAccess, passMark, passedLands } from "@/lib/quiz/unlocks";
import { WHATSAPP_LINK } from "@/lib/quiz/contact";
import { APP } from "@/lib/app";

const OPEN_FLAGS: PublicFlags = {
  maintenance: false,
  registrationsEnabled: true,
  featureBattle: true,
  featureDaily: true,
  featureAcademy: false,
  featureNews: true,
  featureSports: true,
  announcement: "",
  forceUpdate: false,
  minAppVersion: "",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Land = (typeof lands)[number];
type HomeTab = "journey" | "challenge" | "games" | "more";

/** Bible sections grouped for the journey. */
const GROUPS: { id: string; title: string; note: string; ids: string[] }[] = [
  { id: "ot", title: "The Old Testament", note: "From the Garden to the prophets", ids: ["creation", "patriarchs", "exodus", "kings", "prophets", "psalms"] },
  { id: "nt", title: "The New Testament", note: "Jesus and the early church", ids: ["jesus", "miracles", "parables", "cross", "church"] },
  { id: "tr", title: "Bible Treasures", note: "People, words and wonders", ids: ["women", "whosaid", "books", "verses", "animals"] },
];

/** Verse of the day (King James Version, public domain). */
const VERSES: [string, string][] = [
  ["Thy word is a lamp unto my feet, and a light unto my path.", "Psalm 119:105"],
  ["The LORD is my shepherd; I shall not want.", "Psalm 23:1"],
  ["I can do all things through Christ which strengtheneth me.", "Philippians 4:13"],
  ["Be ye kind one to another, tenderhearted, forgiving one another.", "Ephesians 4:32"],
  ["Trust in the LORD with all thine heart.", "Proverbs 3:5"],
  ["This is the day which the LORD hath made; we will rejoice and be glad in it.", "Psalm 118:24"],
  ["Suffer little children to come unto me.", "Matthew 19:14"],
  ["Be strong and of a good courage; be not afraid.", "Joshua 1:9"],
  ["God is love.", "1 John 4:8"],
  ["Children, obey your parents in the Lord: for this is right.", "Ephesians 6:1"],
  ["Let your light so shine before men.", "Matthew 5:16"],
  ["What time I am afraid, I will trust in thee.", "Psalm 56:3"],
  ["Be still, and know that I am God.", "Psalm 46:10"],
  ["A soft answer turneth away wrath.", "Proverbs 15:1"],
];

const PRAISE = ["Well done, good and faithful servant!", "Amen! That's right!", "Hallelujah! Correct!", "Wonderful! You know your Bible!", "Blessed! Spot on!"];
const COMFORT = ["Good try! Let's read it together.", "Not quite. Here's what the Bible says.", "Keep going. Every question teaches us something."];

const GEMS = [
  { name: "Ruby", cls: "is-ruby" },
  { name: "Sapphire", cls: "is-sapphire" },
  { name: "Emerald", cls: "is-emerald" },
  { name: "Topaz", cls: "is-topaz" },
];

const LEVEL_TEXT: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", difficult: "Hard", advanced: "Expert" };
const LEVEL_NOTE: Record<Difficulty, string> = {
  easy: "A small flame to start",
  medium: "A steady light",
  difficult: "A bright lamp",
  advanced: "A blazing lamp: the hardest questions",
};

function sceneFor(id: string) {
  return `/art/kings/scenes/${id}.svg`;
}

function pickOf<T>(list: T[], seed: number) {
  return list[Math.abs(seed) % list.length];
}

function dayNumber() {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

// ───────────────────────── shell ─────────────────────────

export function KingsApp() {
  const screen = useQuiz((s) => s.screen);
  const round = useQuiz((s) => s.round);
  const [help, setHelp] = useState(false);
  const [gate, setGate] = useState(true);
  const [tab, setTab] = useState<HomeTab>("journey");
  const [flags, setFlags] = useState<PublicFlags>(OPEN_FLAGS);
  const onFlags = useCallback((next: PublicFlags) => setFlags(next), []);

  useEffect(() => {
    const t = window.setTimeout(trackVisit, 800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const ready = useQuiz.persist.rehydrate();
    void Promise.resolve(ready).then(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("room")) useQuiz.getState().go("battle");
      else if (params.has("weekly") && !useQuiz.getState().round) useQuiz.getState().go("weekly");
    });
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = window.setTimeout(() => setGate(false), reduce ? 1800 : 3600);
    return () => window.clearTimeout(done);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, tab]);

  const immersive = screen === "play" || screen === "bonus" || ["bricks", "whot", "match", "bounce", "battle", "command"].includes(screen);

  return (
    <main className={cx("kq", `kq-on-${screen}`, immersive && "is-immersive")}>
      <KqSky dim={immersive} />
      <CloudSync onFlags={onFlags} />
      <div className="kq-shell">
        {!immersive && <KqHeader onHelp={() => setHelp(true)} />}
        {flags.announcement && <p className="kq-notice">{flags.announcement}</p>}
        {flags.maintenance && <p className="kq-notice">We are doing some work on the app. Playing on this phone still works.</p>}
        <div key={`${screen}-${screen === "map" ? tab : round?.index ?? ""}`} className="kq-screen">
          {screen === "camp" && <KqWelcome flags={flags} />}
          {screen === "map" && <KqHome tab={tab} flags={flags} onTab={setTab} />}
          {screen === "play" && <KqPlay />}
          {screen === "break" && <KqBreak />}
          {screen === "summary" && <KqSummary />}
          {screen === "shop" && <KqShop />}
          {screen === "bonus" && <KqBonus />}
          {screen === "badges" && <KqBadges />}
          {screen === "board" && <KqBoard />}
          {screen === "daily" && <KqDaily />}
          {screen === "weekly" && (
            <KqLegacy title="This week's challenge">
              <Weekly />
            </KqLegacy>
          )}
          {screen === "certificate" && (
            <KqLegacy>
              <Certificate />
            </KqLegacy>
          )}
          {screen === "battle" && (
            <KqLegacy title="Play online" back>
              <BattleRoom />
            </KqLegacy>
          )}
          {screen === "command" && (
            <KqLegacy title="Command Center" back>
              <CommandCenter />
            </KqLegacy>
          )}
          {screen === "academy" && <KqHome tab="journey" flags={flags} onTab={setTab} />}
          {screen === "bricks" && <KqGame><Bricks /></KqGame>}
          {screen === "whot" && <KqGame><Whot /></KqGame>}
          {screen === "match" && <KqGame><Match3 /></KqGame>}
          {screen === "bounce" && <KqGame><Bounce /></KqGame>}
          {["snake", "memory", "label"].includes(screen) && <KqHome tab="games" flags={flags} onTab={setTab} />}
        </div>
        {!immersive && <KqFooter />}
      </div>
      {screen === "map" && <KqNav tab={tab} onTab={setTab} />}
      {gate && <KqGate onEnter={() => setGate(false)} />}
      {help && <HelpMap onClose={() => setHelp(false)} />}
    </main>
  );
}

function KqSky({ dim }: { dim?: boolean }) {
  return (
    <div className={cx("kq-sky", dim && "is-dim")} aria-hidden="true">
      <span className="kq-sun" />
      <span className="kq-cloud is-1" />
      <span className="kq-cloud is-2" />
      <span className="kq-cloud is-3" />
      <span className="kq-bird is-1" />
      <span className="kq-bird is-2" />
      <img src="/art/kings/landscape.svg" alt="" className="kq-land" />
    </div>
  );
}

function KqGate({ onEnter }: { onEnter: () => void }) {
  return (
    <button type="button" className="kq-gate" onClick={onEnter} aria-label="Enter King's Bible Quest">
      <span className="kq-gate-rays" aria-hidden />
      <img src="/art/kings/landscape.svg" alt="" className="kq-gate-land" aria-hidden />
      <span className="kq-gate-card">
        <img src={APP.mark} alt="" className="kq-gate-logo" />
        <span className="kq-gate-title">
          <small>King's</small>
          Bible Quest
        </span>
        <span className="kq-gate-verse">
          “Thy word is a lamp unto my feet, and a light unto my path.”
          <em>Psalm 119:105</em>
        </span>
        <span className="kq-gate-tap">Tap to begin</span>
      </span>
      <span className="kq-gate-credit">A PromiseVisuals app · Made in Nigeria</span>
    </button>
  );
}

function KqHeader({ onHelp }: { onHelp: () => void }) {
  const screen = useQuiz((s) => s.screen);
  const name = useQuiz((s) => s.name);
  const role = useQuiz((s) => s.role);
  const voiceOn = useQuiz((s) => s.voiceOn);
  const toggleVoice = useQuiz((s) => s.toggleVoice);
  const park = useQuiz((s) => s.park);
  const go = useQuiz((s) => s.go);
  const shopForced = useQuiz((s) => s.shopForced);
  const showBack = screen !== "camp" && screen !== "map" && !shopForced;

  return (
    <header className="kq-header">
      <div className="kq-header-side">
        {showBack ? (
          <button type="button" className="kq-round" onClick={() => park("map")} aria-label="Back to home">
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <button type="button" className="kq-round" onClick={onHelp} aria-label="How to play">
            <CircleHelp className="size-5" aria-hidden />
          </button>
        )}
      </div>
      <button type="button" className="kq-crest" onClick={() => park(name ? "map" : "camp")}>
        <img src={APP.mark} alt="" />
        <span>
          <small>King's</small>
          Bible Quest
        </span>
      </button>
      <div className="kq-header-side is-end">
        {role === "owner" && (
          <button type="button" className="kq-round is-gold" onClick={() => go("command")} aria-label="Command Center">
            <Shield className="size-5" aria-hidden />
          </button>
        )}
        <button
          type="button"
          className="kq-round"
          aria-pressed={voiceOn}
          onClick={() => {
            if (voiceOn) stopSpeak();
            toggleVoice();
          }}
          aria-label={voiceOn ? "Turn reading aloud off" : "Turn reading aloud on"}
        >
          {voiceOn ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
        </button>
      </div>
    </header>
  );
}

function KqFooter() {
  return (
    <p className="kq-footer">
      A <b>PromiseVisuals</b> app · Made in Nigeria · Scripture quotes from the King James Version
    </p>
  );
}

function KqMedals({ compact }: { compact?: boolean }) {
  const lives = useQuiz((s) => s.lives);
  const coins = useQuiz((s) => s.coins);
  const streak = useQuiz((s) => s.streak);
  const hints = useQuiz((s) => s.hints);
  const go = useQuiz((s) => s.go);
  const items: { label: string; value: number; icon: LucideIcon; cls: string; onClick: () => void }[] = [
    { label: "Hearts", value: lives, icon: Heart, cls: "is-heart", onClick: () => go("shop") },
    { label: "Coins", value: coins, icon: Coins, cls: "is-coin", onClick: () => go("shop") },
    { label: "Streak", value: streak, icon: Flame, cls: "is-flame", onClick: () => go("badges") },
    { label: "Hints", value: hints, icon: Lightbulb, cls: "is-hint", onClick: () => go("shop") },
  ];
  return (
    <div className={cx("kq-medals", compact && "is-compact")}>
      {items.map((m) => (
        <button key={m.label} type="button" className={cx("kq-medal", m.cls)} onClick={m.onClick} aria-label={`${m.label}: ${m.value}`}>
          <span className="kq-medal-coin">
            <m.icon className="size-4" aria-hidden />
          </span>
          <b>{m.value}</b>
          {!compact && <small>{m.label}</small>}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────── welcome ─────────────────────────

function KqWelcome({ flags }: { flags: PublicFlags }) {
  const name = useQuiz((s) => s.name);
  const age = useQuiz((s) => s.age);
  const difficulty = useQuiz((s) => s.difficulty);
  const challenge = useQuiz((s) => s.challenge);
  const round = useQuiz((s) => s.round);
  const setName = useQuiz((s) => s.setName);
  const setAge = useQuiz((s) => s.setAge);
  const setDifficulty = useQuiz((s) => s.setDifficulty);
  const setChallenge = useQuiz((s) => s.setChallenge);
  const begin = useQuiz((s) => s.begin);
  const { user } = useQuizSession();

  const paths: { id: Age; title: string; sub: string; art: string }[] = [
    { id: "young", title: "Little Lambs", sub: "Kids", art: "/art/kings/kids.svg" },
    { id: "old", title: "Shepherds", sub: "Teens & grown-ups", art: "/art/kings/adults.svg" },
  ];
  const levels: Difficulty[] = ["easy", "medium", "difficult", "advanced"];

  return (
    <form
      className="kq-welcome"
      onSubmit={(event) => {
        event.preventDefault();
        begin();
      }}
    >
      <div className="kq-scroll">
        <p className="kq-eyebrow">Shalom! Welcome, friend</p>
        <h1 className="kq-title">Who is reading today?</h1>
        <label className="kq-name">
          <span>Your name</span>
          <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Type your name" autoComplete="off" />
        </label>
      </div>

      <h2 className="kq-step">
        <span>1</span> Choose your path
      </h2>
      <div className="kq-paths" role="radiogroup" aria-label="Who is playing">
        {paths.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={age === p.id} onClick={() => setAge(p.id)} className={cx("kq-path", age === p.id && "is-on")}>
            <img src={p.art} alt="" />
            <span className="kq-path-text">
              <b>{p.title}</b>
              <small>{p.sub}</small>
            </span>
            <span className="kq-path-tick" aria-hidden>
              ✓
            </span>
          </button>
        ))}
      </div>

      <h2 className="kq-step">
        <span>2</span> How bright is your lamp?
      </h2>
      <div className="kq-lamps" role="radiogroup" aria-label="Difficulty">
        {levels.map((lv, i) => (
          <button key={lv} type="button" role="radio" aria-checked={difficulty === lv} onClick={() => setDifficulty(lv)} className={cx("kq-lamp", difficulty === lv && "is-on")}>
            <img src={`/art/kings/lamp-${i + 1}.svg`} alt="" />
            <b>{LEVEL_TEXT[lv]}</b>
          </button>
        ))}
      </div>
      <p className="kq-hint">{LEVEL_NOTE[difficulty]}</p>
      {difficulty === "advanced" && (
        <div className="kq-modes">
          {ADVANCED_MODES.map((mode) => (
            <button key={mode} type="button" onClick={() => setChallenge(mode)} className={cx("kq-chip", challenge === mode && "is-on")}>
              {mode}
            </button>
          ))}
        </div>
      )}

      <button type="submit" className="kq-seal">
        <Crown className="size-5" aria-hidden />
        {round ? "Continue my quest" : "Begin the quest"}
      </button>

      <div className="kq-welcome-extra">
        {user ? (
          <button type="button" className="kq-link" onClick={() => void signOut().catch(() => {})}>
            Signed in as {user.email}. Sign out
          </button>
        ) : (
          <Link to="/login" className="kq-link">
            Sign in to keep your progress on every device
          </Link>
        )}
        {!flags.registrationsEnabled && <p className="kq-hint">New accounts are paused for now.</p>}
        <Inbox />
        <InstallButton />
      </div>
    </form>
  );
}

// ───────────────────────── home ─────────────────────────

function KqHome({ tab, flags, onTab }: { tab: HomeTab; flags: PublicFlags; onTab: (t: HomeTab) => void }) {
  return (
    <div className="kq-home">
      {tab === "journey" && <KqJourney />}
      {tab === "challenge" && <KqChallenges flags={flags} />}
      {tab === "games" && <KqGames />}
      {tab === "more" && <KqMore onTab={onTab} />}
    </div>
  );
}

function KqPageTitle({ eyebrow, title, note }: { eyebrow?: string; title: string; note?: string }) {
  return (
    <div className="kq-pagetitle">
      {eyebrow && <p className="kq-eyebrow">{eyebrow}</p>}
      <h1 className="kq-title">{title}</h1>
      {note && <p className="kq-sub">{note}</p>}
    </div>
  );
}

function KqJourney() {
  const name = useQuiz((s) => s.name);
  const landDone = useQuiz((s) => s.landDone);
  const landCorrect = useQuiz((s) => s.landCorrect);
  const totalStars = useQuiz((s) => s.totalStars);
  const round = useQuiz((s) => s.round);
  const go = useQuiz((s) => s.go);
  const abandon = useQuiz((s) => s.abandon);
  const shopForced = useQuiz((s) => s.shopForced);
  const [open, setOpen] = useState<string | null>(null);
  const [casting, setCasting] = useState<string | null>(null);
  const verse = pickOf(VERSES, dayNumber());
  const byId = useMemo(() => new Map(lands.map((l) => [l.id, l])), []);
  const done = lands.filter((l) => landDone[l.id]).length;

  const castLots = () => {
    if (casting) return;
    const pool = lands.filter((l) => !landDone[l.id]);
    const from = pool.length ? pool : lands;
    let hops = 0;
    const id = window.setInterval(() => {
      hops += 1;
      setCasting(lands[Math.floor(Math.random() * lands.length)]?.id ?? null);
      if (hops >= 10) {
        window.clearInterval(id);
        const target = from[Math.floor(Math.random() * from.length)];
        setCasting(null);
        if (target) setOpen(target.id);
      }
    }, 110);
  };

  return (
    <section className="kq-journey">
      <div className="kq-hello">
        <div className="kq-hello-top">
          <div>
            <p className="kq-eyebrow">Shalom{name ? "," : ""}</p>
            <h1 className="kq-title">{name || "Friend"}</h1>
          </div>
          <div className="kq-progress-crown" style={{ "--pct": `${Math.round((done / lands.length) * 100)}%` } as CSSProperties}>
            <Crown className="size-5" aria-hidden />
            <b>
              {done}/{lands.length}
            </b>
            <small>sections</small>
          </div>
        </div>
        <KqMedals />
        <blockquote className="kq-verse">
          <span className="kq-verse-label">
            <BookOpenText className="size-4" aria-hidden /> Verse of the day
          </span>
          <p>“{verse[0]}”</p>
          <cite>{verse[1]}</cite>
        </blockquote>
        <p className="kq-stars-line">
          <Sparkles className="size-4" aria-hidden /> {totalStars} {totalStars === 1 ? "star" : "stars"} collected
        </p>
      </div>

      {round && (
        <div className="kq-resume">
          <img src={sceneFor(round.landId ?? "verses")} alt="" />
          <div>
            <p className="kq-eyebrow">Still reading</p>
            <b>{round.title}</b>
            <small>
              Question {round.index + 1} of {round.items.length}
            </small>
          </div>
          <div className="kq-resume-actions">
            <button type="button" className="kq-btn is-royal" onClick={() => go(shopForced ? "shop" : "play")}>
              Continue
            </button>
            <button type="button" className="kq-btn is-plain" onClick={abandon}>
              Stop
            </button>
          </div>
        </div>
      )}

      <button type="button" className={cx("kq-lots", casting && "is-casting")} onClick={castLots}>
        <span className="kq-lots-dice" aria-hidden>
          <i />
          <i />
        </span>
        <span>
          <b>Cast lots</b>
          <small>Let the app choose a section for you</small>
        </span>
      </button>

      {GROUPS.map((group, gi) => (
        <div key={group.id} className={cx("kq-group", `is-${group.id}`)}>
          <div className="kq-group-head">
            <span className="kq-group-roman" aria-hidden>
              {["I", "II", "III"][gi]}
            </span>
            <div>
              <h2>{group.title}</h2>
              <p>{group.note}</p>
            </div>
          </div>
          <div className="kq-cards">
            {group.ids.map((id, i) => {
              const land = byId.get(id);
              if (!land) return null;
              const best = landCorrect[id] ?? 0;
              const isDone = !!landDone[id];
              const crowns = Math.round((best / land.count) * 5);
              return (
                <button
                  key={id}
                  type="button"
                  className={cx("kq-card", isDone && "is-done", casting === id && "is-lit")}
                  style={{ animationDelay: `${i * 50}ms` }}
                  onClick={() => setOpen(id)}
                >
                  <span className="kq-card-art">
                    <img src={sceneFor(id)} alt="" loading="lazy" />
                    {isDone && <span className="kq-card-ribbon">Done</span>}
                  </span>
                  <span className="kq-card-body">
                    <b>{land.name}</b>
                    <span className="kq-card-crowns" aria-label={`Best ${best} of ${land.count}`}>
                      {Array.from({ length: 5 }, (_, k) => (
                        <i key={k} className={k < crowns ? "is-on" : ""} />
                      ))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {open && byId.get(open) && <KqSectionSheet land={byId.get(open)!} onClose={() => setOpen(null)} />}
    </section>
  );
}

function KqSectionSheet({ land, onClose }: { land: Land; onClose: () => void }) {
  const startLand = useQuiz((s) => s.startLand);
  const landCorrect = useQuiz((s) => s.landCorrect);
  const landDone = useQuiz((s) => s.landDone);
  const age = useQuiz((s) => s.age);
  const difficulty = useQuiz((s) => s.difficulty);
  const best = landCorrect[land.id] ?? 0;
  const done = !!landDone[land.id];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="kq-sheet-wrap" role="dialog" aria-modal="true" aria-label={land.name} onClick={onClose}>
      <div className="kq-sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="kq-sheet-close" onClick={onClose} aria-label="Close">
          <X className="size-5" aria-hidden />
        </button>
        <div className="kq-sheet-art">
          <img src={sceneFor(land.id)} alt="" />
        </div>
        <div className="kq-sheet-body">
          <p className="kq-eyebrow">{done ? `Completed · best ${best}/${land.count}` : `${land.count} questions`}</p>
          <h2 className="kq-title">{land.name}</h2>
          <p className="kq-sub">{APP.blurbs[land.id]}</p>
          <p className="kq-sheet-meta">
            <span>{age === "young" ? "Little Lambs (kids)" : "Shepherds (grown-ups)"}</span>
            <span>{LEVEL_TEXT[difficulty]}</span>
            <span>3 hearts</span>
          </p>
          <button
            type="button"
            className="kq-seal"
            onClick={() => {
              onClose();
              startLand(land.id);
            }}
          >
            <BookOpenText className="size-5" aria-hidden />
            {done ? "Read it again" : "Start reading"}
          </button>
        </div>
      </div>
    </div>,
    document.querySelector("main.kq") ?? document.body,
  );
}

function KqChallenges({ flags }: { flags: PublicFlags }) {
  const dailyDone = useQuiz((s) => s.dailyDone);
  const dailyDate = useQuiz((s) => s.dailyDate);
  const dailyScore = useQuiz((s) => s.dailyScore);
  const startDaily = useQuiz((s) => s.startDaily);
  const weekly = useQuiz((s) => s.weekly);
  const startWeekly = useQuiz((s) => s.startWeekly);
  const go = useQuiz((s) => s.go);
  const dailyToday = dailyDone && dailyDate === todayKey();
  const weekDone = weekly?.week === weekKey() ? weekly : null;

  return (
    <section className="kq-panel">
      <KqPageTitle eyebrow="Challenges" title="The Arena of Faith" note="New questions every day and every week." />
      <div className="kq-tiles">
        {flags.featureDaily && (
          <button type="button" className="kq-tile is-dawn" onClick={() => (dailyToday ? go("daily") : startDaily())}>
            <span className="kq-tile-icon">
              <Sparkles className="size-7" aria-hidden />
            </span>
            <b>Daily Manna</b>
            <small>{dailyToday ? `Done today · ${dailyScore}/5` : "5 questions · 75 coins"}</small>
          </button>
        )}
        <button type="button" className="kq-tile is-royal" onClick={() => (weekDone ? go("weekly") : startWeekly())}>
          <span className="kq-tile-icon">
            <Medal className="size-7" aria-hidden />
          </span>
          <b>Weekly Challenge</b>
          <small>{weekDone ? `You scored ${weekDone.correct}/${weekDone.total}` : "10 questions · share your score"}</small>
        </button>
        {flags.featureBattle && (
          <button type="button" className="kq-tile is-sea" onClick={() => go("battle")}>
            <span className="kq-tile-icon">
              <Wifi className="size-7" aria-hidden />
            </span>
            <b>Play online</b>
            <small>Make a room and invite friends</small>
          </button>
        )}
        <button type="button" className="kq-tile is-olive" onClick={() => go("board")}>
          <span className="kq-tile-icon">
            <Trophy className="size-7" aria-hidden />
          </span>
          <b>Hall of Faith</b>
          <small>Top scores on this phone</small>
        </button>
      </div>
      <div className="kq-duel">
        <p className="kq-eyebrow">
          <Swords className="size-4" aria-hidden /> Two players, one phone
        </p>
        <Duel />
      </div>
    </section>
  );
}

function KqMore({ onTab }: { onTab: (t: HomeTab) => void }) {
  const go = useQuiz((s) => s.go);
  const park = useQuiz((s) => s.park);
  const name = useQuiz((s) => s.name);
  const { user } = useQuizSession();
  return (
    <section className="kq-panel">
      <KqPageTitle eyebrow="Your scroll" title={name || "My things"} />
      <div className="kq-list">
        <button type="button" className="kq-row" onClick={() => go("badges")}>
          <Medal className="size-5" aria-hidden /> <span>My badges</span>
        </button>
        <button type="button" className="kq-row" onClick={() => go("shop")}>
          <ShoppingBag className="size-5" aria-hidden /> <span>Market (hearts and hints)</span>
        </button>
        <button type="button" className="kq-row" onClick={() => park("camp")}>
          <Users className="size-5" aria-hidden /> <span>Change name, path or lamp</span>
        </button>
        <button type="button" className="kq-row" onClick={() => onTab("games")}>
          <Gamepad2 className="size-5" aria-hidden /> <span>Game Courtyard</span>
        </button>
        {user ? (
          <button type="button" className="kq-row" onClick={() => void signOut().catch(() => {})}>
            <Shield className="size-5" aria-hidden /> <span>Sign out ({user.email})</span>
          </button>
        ) : (
          <Link to="/login" className="kq-row">
            <Shield className="size-5" aria-hidden /> <span>Sign in to save progress</span>
          </Link>
        )}
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="kq-row">
          <Heart className="size-5" aria-hidden /> <span>Parents: chat with us on WhatsApp</span>
        </a>
      </div>
      <div className="kq-share">
        <ShareQuizyButton variant="card" />
      </div>
      <InstallButton />
      <Inbox />
    </section>
  );
}

const GAME_ART_BG: Record<string, string> = { bricks: "is-night", whot: "is-sea", match: "is-dawn", bounce: "is-olive" };

function KqGames() {
  const go = useQuiz((s) => s.go);
  const landCorrect = useQuiz((s) => s.landCorrect);
  const tickets = useQuiz((s) => s.tickets);
  const owner = useQuiz((s) => s.role === "owner");
  const best = useQuiz((s) => s.arcadeBest);
  const passed = passedLands(landCorrect, lands);
  const [note, setNote] = useState("");
  const bestText: Record<string, string> = {
    bricks: best.bricks ? `Best: ${best.bricks} lines` : "New game",
    whot: best["whot-wins"] ? `Won ${best["whot-wins"]}` : "New game",
    match: best.match ? `Best: level ${best.match}` : "New game",
    bounce: best.bounce ? `Reached level ${best.bounce}` : "New game",
  };
  return (
    <section className="kq-panel">
      <div className="kq-games-head">
        <KqPageTitle eyebrow="Earned by learning" title="Game Courtyard" />
        <span className="kq-tickets" aria-label={owner ? "Owner: free play" : `${tickets} game tickets`}>
          <Ticket className="size-5" aria-hidden />
          <b>{owner ? "Free" : tickets}</b>
          <small>{owner ? "owner" : tickets === 1 ? "ticket" : "tickets"}</small>
        </span>
      </div>
      <p className="kq-sub">
        Score {passMark(10)}/10 or more in a section to win 3 tickets. Every new section you pass opens another game.
      </p>
      <div className="kq-games">
        {FUN_GAMES.map((game, i) => {
          const access = gameAccess(game, passed, tickets, owner);
          const locked = !access.open && access.reason === "locked";
          return (
            <button
              key={game.id}
              type="button"
              className={cx("kq-game-card", GAME_ART_BG[game.id], locked && "is-locked")}
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => {
                if (access.open) go(game.id);
                else if (access.reason === "locked")
                  setNote(`${game.name} opens when you pass ${game.needLands} ${game.needLands === 1 ? "section" : "sections"} with ${passMark(10)}/10 or more. You have passed ${passed}.`);
                else setNote("No tickets left. Play a section and score 7/10 or more to win 3 more.");
              }}
            >
              <span className="kq-game-art">
                <img src={game.art} alt="" />
                {locked && (
                  <span className="kq-game-lock">
                    <Lock className="size-6" aria-hidden />
                    <small>
                      {passed}/{game.needLands}
                    </small>
                  </span>
                )}
              </span>
              <b>{game.name}</b>
              <small>{locked ? `Pass ${game.needLands} ${game.needLands === 1 ? "section" : "sections"}` : bestText[game.id]}</small>
            </button>
          );
        })}
      </div>
      {note && (
        <p className="kq-scroll kq-done-note" role="status">
          {note}
        </p>
      )}
    </section>
  );
}

function KqNav({ tab, onTab }: { tab: HomeTab; onTab: (t: HomeTab) => void }) {
  const items: { id: HomeTab; label: string; icon: LucideIcon }[] = [
    { id: "journey", label: "Journey", icon: BookOpenText },
    { id: "challenge", label: "Challenges", icon: Trophy },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "more", label: "Me", icon: Users },
  ];
  return (
    <nav className="kq-nav" aria-label="Main">
      {items.map((it) => (
        <button key={it.id} type="button" className={cx("kq-nav-btn", tab === it.id && "is-on")} aria-current={tab === it.id ? "page" : undefined} onClick={() => onTab(it.id)}>
          <it.icon className="size-5" aria-hidden />
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ───────────────────────── play ─────────────────────────

function KqPlay() {
  const round = useQuiz((s) => s.round);
  const voiceOn = useQuiz((s) => s.voiceOn);
  const hints = useQuiz((s) => s.hints);
  const lives = useQuiz((s) => s.lives);
  const answerChoice = useQuiz((s) => s.answerChoice);
  const submitSpell = useQuiz((s) => s.submitSpell);
  const useHint = useQuiz((s) => s.useHint);
  const next = useQuiz((s) => s.next);
  const park = useQuiz((s) => s.park);
  const battlePick = useQuiz((s) => s.battlePick);
  const battleAdvance = useQuiz((s) => s.battleAdvance);
  const [draft, setDraft] = useState("");
  const item = round?.items[round.index];

  useEffect(() => setDraft(""), [round?.index, round?.mode]);

  useEffect(() => {
    if (!voiceOn || !item || round?.revealed) return;
    speak(item.kind === "spell" ? item.word : item.q);
  }, [voiceOn, item, round?.index, round?.revealed, round?.phase]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (!round || !item || item.kind !== "choice") return;
      const n = Number(event.key);
      if (n < 1 || n > item.opts.length) return;
      if (round.mode === "battle") battlePick(n - 1);
      else if (!round.revealed) answerChoice(n - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, item, answerChoice, battlePick]);

  if (!round || !item) {
    return (
      <section className="kq-panel kq-center">
        <p className="kq-sub">No question is open. Pick a section on your journey.</p>
        <button type="button" className="kq-seal" onClick={() => park("map")}>
          Back to the journey
        </button>
      </section>
    );
  }

  if (round.mode === "battle" && round.phase === "pass") {
    return (
      <section className="kq-panel kq-center kq-pass">
        <p className="kq-eyebrow">Pass the phone</p>
        <h1 className="kq-title">{round.p2Name}, it's your turn</h1>
        <p className="kq-sub">No peeking at the first answer!</p>
        <button type="button" className="kq-seal" onClick={battleAdvance}>
          I am ready
        </button>
      </section>
    );
  }

  const isLand = round.mode === "land";
  const scene = sceneFor(round.landId ?? (round.mode === "weekly" ? "verses" : round.mode === "daily" ? "creation" : "books"));
  const asking = round.mode === "battle" ? (round.phase === "p2" ? round.p2Name : round.p1Name) : null;
  const seed = round.index * 7 + round.correct * 3 + item.id.length;

  return (
    <section className="kq-play">
      <div className="kq-play-top">
        <button type="button" className="kq-round" onClick={() => park("map")} aria-label="Leave for now (your place is kept)">
          <X className="size-5" aria-hidden />
        </button>
        <div className="kq-play-title">
          <b>{round.title}</b>
          <span>
            Question {round.index + 1} of {round.items.length}
          </span>
        </div>
        {isLand ? (
          <span className="kq-hearts" aria-label={`${lives} hearts left`}>
            {[0, 1, 2].map((i) => (
              <Heart key={i} className={cx("size-5", i < lives ? "is-full" : "is-empty")} aria-hidden />
            ))}
          </span>
        ) : (
          <span className="kq-hearts" />
        )}
      </div>
      <div className="kq-pebbles" aria-hidden>
        {round.items.map((it, i) => {
          const pick = round.picks[i];
          const state =
            i < round.index || (i === round.index && round.revealed)
              ? it.kind === "choice" && pick === it.a
                ? "is-right"
                : "is-wrong"
              : i === round.index
                ? "is-now"
                : "";
          return <i key={it.id + i} className={state} />;
        })}
      </div>

      <div className="kq-stage">
        <img src={scene} alt="" className="kq-stage-art" />
        {asking && <p className="kq-asking">{asking}'s turn</p>}
      </div>

      {item.kind === "choice" ? (
        <KqChoice item={item} round={round} onPick={(i) => (round.mode === "battle" ? battlePick(i) : answerChoice(i))} seed={seed} />
      ) : (
        <form
          className="kq-scroll kq-question"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            if (!round.revealed) submitSpell(draft);
          }}
        >
          <h2>Spell the word</h2>
          <p className="kq-sub">{item.hint}</p>
          <button type="button" className="kq-btn is-plain" onClick={() => speak(item.word)}>
            <Volume2 className="size-4" aria-hidden /> Hear it
          </button>
          <input className="kq-spell" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={round.revealed} aria-label="Your spelling" />
          {!round.revealed && (
            <button type="submit" className="kq-seal">
              Check
            </button>
          )}
        </form>
      )}

      {!round.revealed && round.mode === "land" && item.kind === "choice" && (
        <div className="kq-tools">
          <button type="button" className="kq-tool" onClick={useHint} disabled={hints <= 0}>
            <img src="/art/kings/lamp-2.svg" alt="" />
            <span>
              <b>Light a lamp</b>
              <small>Removes a wrong answer · {hints} left</small>
            </span>
          </button>
          {voiceOn && (
            <button type="button" className="kq-tool is-small" onClick={() => speak(item.q)} aria-label="Read the question aloud">
              <Volume2 className="size-5" aria-hidden />
            </button>
          )}
        </div>
      )}

      {round.revealed && round.mode !== "battle" && (
        <button type="button" className="kq-seal is-next" onClick={next}>
          {round.index === round.items.length - 1 ? "Finish the section" : "Next question"}
        </button>
      )}

      {round.mode === "battle" && round.phase === "reveal" && item.kind === "choice" && (
        <div className="kq-scroll kq-duel-result">
          <p>
            {round.p1Name} {round.p1Pick === item.a ? "✓" : "✗"} · {round.p2Name} {round.picks[round.index] === item.a ? "✓" : "✗"}
          </p>
          <b>
            {round.p1Score} – {round.p2Score}
          </b>
          <button type="button" className="kq-seal" onClick={battleAdvance}>
            {round.index === round.items.length - 1 ? "See who won" : "Next round"}
          </button>
        </div>
      )}
    </section>
  );
}

function KqChoice({
  item,
  round,
  onPick,
  seed,
}: {
  item: Extract<PlayItem, { kind: "choice" }>;
  round: NonNullable<ReturnType<typeof useQuiz.getState>["round"]>;
  onPick: (i: number) => void;
  seed: number;
}) {
  const locked = round.mode === "battle" ? round.phase === "reveal" || round.phase === "pass" : round.revealed;
  const picked = round.picks[round.index];
  const show = round.mode === "battle" ? round.phase === "reveal" : round.revealed;
  const right = show && picked === item.a;

  return (
    <>
      <div className="kq-scroll kq-question">
        <h2>{item.q}</h2>
      </div>
      <div className="kq-answers">
        {item.opts.map((opt, i) => {
          const hidden = item.hidden.includes(i);
          const isRight = show && i === item.a;
          const isWrong = show && picked === i && i !== item.a;
          return (
            <button
              key={`${item.id}-${i}`}
              type="button"
              disabled={hidden || locked}
              onClick={() => onPick(i)}
              className={cx("kq-answer", GEMS[i]?.cls, hidden && "is-gone", isRight && "is-right", isWrong && "is-wrong", show && !isRight && !isWrong && "is-dim")}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="kq-gem" aria-hidden />
              <span className="kq-answer-text">{opt}</span>
              {isRight && <span className="kq-answer-mark">✓</span>}
              {isWrong && <span className="kq-answer-mark">✗</span>}
            </button>
          );
        })}
      </div>
      {show && round.mode !== "battle" && (
        <div className={cx("kq-feedback", right ? "is-right" : "is-wrong")} role="status">
          <p className="kq-feedback-head">{right ? pickOf(PRAISE, seed) : pickOf(COMFORT, seed)}</p>
          {item.exp && (
            <p className="kq-feedback-verse">
              <BookOpenText className="size-5 shrink-0" aria-hidden />
              <span>{item.exp}</span>
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ───────────────────────── after a section ─────────────────────────

function KqBreak() {
  const card = useQuiz((s) => s.breakCard);
  const shown = useQuiz((s) => s.breakShown);
  const revealBreak = useQuiz((s) => s.revealBreak);
  const continueBreak = useQuiz((s) => s.continueBreak);
  const ticketNote = useQuiz((s) => s.ticketNote);
  const clearTicketNote = useQuiz((s) => s.clearTicketNote);
  if (!card) return null;
  const score = /(\d+)\/(\d+)/.exec(ticketNote);
  const got = score ? Number(score[1]) : null;
  const of = score ? Number(score[2]) : null;
  const passed = ticketNote.includes("+");
  const crowns = got !== null && of ? Math.round((got / of) * 5) : 0;

  return (
    <section className="kq-panel kq-center kq-break">
      {got !== null && of !== null && (
        <div className="kq-result">
          <p className="kq-eyebrow">Section complete</p>
          <h1 className="kq-title">{got === of ? "Perfect! Glory to God!" : passed ? "Well done!" : "Good effort!"}</h1>
          <div className="kq-result-crowns" aria-label={`${got} of ${of}`}>
            {Array.from({ length: 5 }, (_, k) => (
              <Crown key={k} className={cx("size-8", k < crowns && "is-on")} aria-hidden />
            ))}
          </div>
          <p className="kq-result-score">
            <b>{got}</b> / {of} correct
          </p>
          <p className="kq-sub">{passed ? ticketNote.replace(/^.*?! /, "") : `Score ${Math.ceil(of * 0.7)} or more to earn game tickets.`}</p>
        </div>
      )}
      <div className="kq-scroll kq-selah">
        <p className="kq-eyebrow">{card.type === "riddle" ? "Bible riddle" : "Selah · a little pause"}</p>
        <h2>{card.text}</h2>
        {shown ? (
          <p className="kq-selah-answer">{card.answer}</p>
        ) : (
          <button type="button" className="kq-btn is-plain" onClick={revealBreak}>
            {card.type === "riddle" ? "Show the answer" : "Tell me more"} · 3 coins
          </button>
        )}
      </div>
      <button
        type="button"
        className="kq-seal"
        onClick={() => {
          clearTicketNote();
          continueBreak();
        }}
      >
        Continue the journey
      </button>
      <QuickFeedback context="finished a section" />
    </section>
  );
}

function KqSummary() {
  const note = useQuiz((s) => s.summaryNote);
  const park = useQuiz((s) => s.park);
  return (
    <section className="kq-panel kq-center">
      <Trophy className="kq-big-icon" aria-hidden />
      <p className="kq-eyebrow">Finished</p>
      <h1 className="kq-title">Well done!</h1>
      <p className="kq-sub">{note}</p>
      <button type="button" className="kq-seal" onClick={() => park("map")}>
        Back to the journey
      </button>
      <QuickFeedback context="finished a challenge" />
    </section>
  );
}

function KqDaily() {
  const dailyDone = useQuiz((s) => s.dailyDone);
  const dailyDate = useQuiz((s) => s.dailyDate);
  const dailyScore = useQuiz((s) => s.dailyScore);
  const startDaily = useQuiz((s) => s.startDaily);
  const done = dailyDone && dailyDate === todayKey();
  return (
    <section className="kq-panel kq-center">
      <p className="kq-eyebrow">Today</p>
      <h1 className="kq-title">Daily Manna</h1>
      <p className="kq-sub">Like manna each morning: five new questions every day. Finish them for 75 coins.</p>
      {done ? (
        <p className="kq-scroll kq-done-note">You've gathered today's manna: {dailyScore} of 5. Come back tomorrow!</p>
      ) : (
        <button type="button" className="kq-seal" onClick={startDaily}>
          Gather today's manna
        </button>
      )}
    </section>
  );
}

function KqShop() {
  const coins = useQuiz((s) => s.coins);
  const lives = useQuiz((s) => s.lives);
  const hints = useQuiz((s) => s.hints);
  const shopForced = useQuiz((s) => s.shopForced);
  const buyLife = useQuiz((s) => s.buyLife);
  const refillHints = useQuiz((s) => s.refillHints);
  const openBonus = useQuiz((s) => s.openBonus);
  const abandon = useQuiz((s) => s.abandon);
  const park = useQuiz((s) => s.park);
  return (
    <section className="kq-panel">
      <KqPageTitle
        eyebrow={shopForced ? "Out of hearts" : "The market"}
        title={shopForced ? "Rest a moment" : "Market Square"}
        note={shopForced ? "Buy a heart, win one with a bonus question, or leave this section." : "Spend the coins you earn from right answers."}
      />
      <KqMedals />
      <div className="kq-stalls">
        <button type="button" className="kq-stall" disabled={lives >= 3 || coins < 10} onClick={buyLife}>
          <Heart className="size-7" aria-hidden />
          <b>One heart</b>
          <small>10 coins</small>
        </button>
        <button type="button" className="kq-stall" disabled={hints >= 3 || coins < 20} onClick={refillHints}>
          <img src="/art/kings/lamp-3.svg" alt="" />
          <b>Fill all lamps</b>
          <small>20 coins · 3 hints</small>
        </button>
      </div>
      {shopForced && (
        <button type="button" className="kq-seal" onClick={openBonus}>
          Answer a bonus question for a heart
        </button>
      )}
      {shopForced ? (
        <button type="button" className="kq-btn is-plain is-wide" onClick={abandon}>
          Leave this section
        </button>
      ) : (
        <button type="button" className="kq-btn is-plain is-wide" onClick={() => park("map")}>
          Back to the journey
        </button>
      )}
    </section>
  );
}

function KqBonus() {
  const bonus = useQuiz((s) => s.bonus);
  const pick = useQuiz((s) => s.bonusPick);
  const revealed = useQuiz((s) => s.bonusRevealed);
  const answer = useQuiz((s) => s.answerBonus);
  const leave = useQuiz((s) => s.leaveBonus);
  if (!bonus || bonus.kind !== "choice") return null;
  return (
    <section className="kq-play">
      <p className="kq-eyebrow kq-center-text">Bonus question · win a heart</p>
      <div className="kq-scroll kq-question">
        <h2>{bonus.q}</h2>
      </div>
      <div className="kq-answers">
        {bonus.opts.map((opt, i) => {
          const isRight = revealed && i === bonus.a;
          const isWrong = revealed && pick === i && i !== bonus.a;
          return (
            <button
              key={opt}
              type="button"
              disabled={revealed}
              onClick={() => answer(i)}
              className={cx("kq-answer", GEMS[i]?.cls, isRight && "is-right", isWrong && "is-wrong", revealed && !isRight && !isWrong && "is-dim")}
            >
              <span className="kq-gem" aria-hidden />
              <span className="kq-answer-text">{opt}</span>
            </button>
          );
        })}
      </div>
      {revealed && (
        <button type="button" className="kq-seal is-next" onClick={leave}>
          Continue
        </button>
      )}
    </section>
  );
}

const KQ_BADGES: { id: string; name: string; detail: string }[] = [
  { id: "first", name: "First step of faith", detail: "Finish your first section." },
  { id: "sharp", name: "Wise as Solomon", detail: "Score 8 or more in a section." },
  { id: "streak", name: "Ten in a row", detail: "Ten right answers without a miss." },
  { id: "daily", name: "Manna gatherer", detail: "Finish a Daily Manna." },
  { id: "weekly", name: "Faithful every week", detail: "Finish a weekly challenge." },
  { id: "duel", name: "Brave as David", detail: "Win a two-player duel." },
  { id: "trail", name: "Genesis to Revelation", detail: "Finish every section." },
];

function KqBadges() {
  const earned = useQuiz((s) => s.badges);
  const best = useQuiz((s) => s.bestStreak);
  return (
    <section className="kq-panel">
      <KqPageTitle eyebrow="Treasures" title="My badges" note={`Best streak: ${best} in a row.`} />
      <ul className="kq-badges">
        {KQ_BADGES.map((b) => {
          const has = earned.includes(b.id);
          return (
            <li key={b.id} className={cx("kq-badge", has && "is-on")}>
              <span className="kq-badge-seal">
                <Crown className="size-6" aria-hidden />
              </span>
              <b>{b.name}</b>
              <small>{has ? b.detail : `Locked · ${b.detail}`}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function KqBoard() {
  const board = useQuiz((s) => s.board);
  return (
    <section className="kq-panel">
      <KqPageTitle eyebrow="On this phone" title="Hall of Faith" note="Names appear here when someone finishes every section." />
      {board.length === 0 ? (
        <p className="kq-scroll kq-done-note">No one has finished the whole journey yet. Will you be the first?</p>
      ) : (
        <ol className="kq-list">
          {board.map((row, i) => (
            <li key={`${row.name}-${row.at}`} className="kq-row">
              <b>{i + 1}.</b> <span>{row.name}</span>
              <small>
                {row.stars} stars · {row.coins} coins
              </small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function KqLegacy({ title, back, children }: { title?: string; back?: boolean; children: ReactNode }) {
  const park = useQuiz((s) => s.park);
  return (
    <section className="kq-panel kq-legacy">
      {(title || back) && (
        <div className="kq-legacy-head">
          {back && (
            <button type="button" className="kq-round" onClick={() => park("map")} aria-label="Back to home">
              <ArrowLeft className="size-5" aria-hidden />
            </button>
          )}
          {title && <h1 className="kq-title">{title}</h1>}
        </div>
      )}
      <div className="kq-legacy-body">{children}</div>
    </section>
  );
}

function KqGame({ children }: { children: ReactNode }) {
  return <div className="kq-game">{children}</div>;
}
