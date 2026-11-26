import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CircleHelp,
  Coins,
  Dices,
  Flame,
  Gamepad2,
  Heart,
  Lightbulb,
  Lock,
  Map as MapIcon,
  Play as PlayIcon,
  Medal,
  Shield,
  Sparkles,
  Swords,
  Tent,
  Ticket,
  Trophy,
  Volume2,
  VolumeX,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ShareQuizyButton } from "@/components/quiz/ShareQuizy";
import { acknowledgeMessage, listMessages, signOut, trackVisit, useQuizSession, type PublicFlags, type QuizMessage } from "@/lib/quiz/cloud";
import {
  ADVANCED_MODES,
  BADGES,
  academySubjects,
  lands,
  speak,
  stopSpeak,
  todayKey,
  weekKey,
  type Age,
  type Difficulty,
  type PlayItem,
} from "@/lib/quiz/logic";
import { useQuiz, type Round } from "@/lib/quiz/store";
import { BattleRoom } from "@/components/quiz/BattleRoom";
import { CloudSync } from "@/components/quiz/CloudSync";
import { CommandCenter } from "@/components/quiz/CommandCenter";
import { HelpMap } from "@/components/quiz/HelpMap";
import { LabelLab } from "@/components/quiz/LabelLab";
import { MemoryMatch } from "@/components/quiz/MemoryMatch";
import { WordSnake } from "@/components/quiz/WordSnake";
import { Bricks } from "@/components/quiz/Bricks";
import { Whot } from "@/components/quiz/Whot";
import { Match3 } from "@/components/quiz/Match3";
import { Bounce } from "@/components/quiz/Bounce";
import { FUN_GAMES, gameAccess, passMark, passedLands } from "@/lib/quiz/unlocks";
import { Weekly } from "@/components/quiz/WeeklyChallenge";
import { BannerCreatures, JungleLife } from "@/components/quiz/JungleLife";
import { QuickFeedback } from "@/components/quiz/QuickFeedback";
import { TopicPicker } from "@/components/quiz/TopicPicker";
import { topicsFor } from "@/lib/quiz/topics";
import { WHATSAPP_LINK } from "@/lib/quiz/contact";
import { APP, IS_KINGS, landArtFor } from "@/lib/app";

/** Screens where a child is answering: no moving creatures there, so nothing competes with the question. */
const QUIET_SCREENS = new Set(["play", "battle", "command", "certificate", "snake", "memory", "label", "bricks", "whot", "match", "bounce"]);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AGES: { id: Age; label: string; note: string }[] = [
  { id: "young", label: APP.ages.young, note: APP.ages.youngNote },
  { id: "old", label: APP.ages.old, note: APP.ages.oldNote },
];

const LEVELS: { id: Difficulty; label: string; note: string }[] = [
  { id: "easy", label: "Easy", note: "Warm-up" },
  { id: "medium", label: "Medium", note: "Think it through" },
  { id: "difficult", label: "Difficult", note: "Challenge" },
  { id: "advanced", label: "Advanced", note: IS_KINGS ? "The hardest questions in the Book." : "Beast through Volcano — the harder add-on bank." },
];

const OPEN_FLAGS: PublicFlags = {
  maintenance: false,
  registrationsEnabled: true,
  featureBattle: true,
  featureDaily: true,
  featureAcademy: APP.academy,
  featureNews: true,
  featureSports: true,
  announcement: "",
  forceUpdate: false,
  minAppVersion: "",
};

export function QuizApp() {
  const screen = useQuiz((s) => s.screen);
  const round = useQuiz((s) => s.round);
  const [help, setHelp] = useState(false);
  // Opening: the Quizy card ("The trail is open"), then the app.
  const [gate, setGate] = useState<"card" | null>("card");
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
      if (params.has("room")) {
        useQuiz.getState().go("battle");
      } else if (params.has("weekly") && !useQuiz.getState().round) {
        // Friends arrive here from a shared score card.
        useQuiz.getState().go("weekly");
      }
    });
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = window.setTimeout(() => setGate(null), reduce ? 1600 : 3200);
    return () => window.clearTimeout(done);
  }, []);

  return (
    <main className={cn("expedition-app min-h-screen text-fg", IS_KINGS && "is-kings", screen === "camp" && "is-camp", screen === "map" && "is-map", !QUIET_SCREENS.has(screen) && "has-jungle")}>
      <div className="world-bg" aria-hidden="true">
        <img src="/art/compass.jpg" alt="" className="world-compass" />
      </div>
      <CloudSync onFlags={onFlags} />
      <div className="app-shell mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:px-6">
        <TopBar onHelp={() => setHelp(true)} />
        {flags.announcement && (
          <p className="mt-3 rounded-2xl border border-gold bg-surface px-4 py-3 text-sm font-bold">{flags.announcement}</p>
        )}
        {flags.maintenance && (
          <p className="mt-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">
            The expedition is in maintenance. Practice on this device still works. Online rooms may be paused.
          </p>
        )}
        {flags.forceUpdate && (
          <p className="mt-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">
            The expedition asked for version {flags.minAppVersion || "the current one"}. Update the installed app when
            you can. This page still opens.
          </p>
        )}
        {screen === "map" && (
          <figure className="scenic-banner is-trail">
            <img src={APP.banner} alt="" />
            {APP.jungle && <TrailDrift />}
            {APP.jungle && <BannerCreatures scene="trail" />}
          </figure>
        )}
        <div key={`${screen}-${round?.index ?? "x"}-${round?.title ?? ""}`} className={cn("screen-in flex-1", screen === "camp" ? "mt-2" : "mt-4")}>
          {screen === "camp" && <Camp flags={flags} />}
          {screen === "map" && <Trail flags={flags} />}
          {screen === "play" && <Play />}
          {screen === "shop" && <Shop />}
          {screen === "bonus" && <Bonus />}
          {screen === "break" && <Break />}
          {screen === "badges" && <Badges />}
          {screen === "daily" && <Daily />}
          {screen === "weekly" && <Weekly />}
          {screen === "board" && <Board />}
          {screen === "academy" && <Academy />}
          {screen === "summary" && <Summary />}
          {screen === "certificate" && <Certificate />}
          {screen === "battle" && <BattleRoom />}
          {screen === "command" && <CommandCenter />}
          {screen === "snake" && <WordSnake />}
          {screen === "memory" && <MemoryMatch />}
          {screen === "label" && <LabelLab />}
          {screen === "bricks" && <Bricks />}
          {screen === "whot" && <Whot />}
          {screen === "match" && <Match3 />}
          {screen === "bounce" && <Bounce />}
        </div>
        <PvCredit className="app-footer-credit" />
      </div>
      {APP.jungle && !QUIET_SCREENS.has(screen) && <JungleLife />}
      {gate && <TrailGate onEnter={() => setGate(null)} />}
      {help && <HelpMap onClose={() => setHelp(false)} />}
    </main>
  );
}

function TrailDrift() {
  return (
    <div className="trail-drift" aria-hidden="true">
      <span className="lantern-glow" />
      <i className="leaf l1" />
      <i className="leaf l2" />
      <i className="leaf l3" />
      <i className="leaf l4" />
    </div>
  );
}

function TrailGate({ onEnter }: { onEnter: () => void }) {
  return (
    <button type="button" className="trail-gate" onClick={onEnter}>
      <span className="trail-gate-card">
        <img src={APP.mark} alt="" className="splash-logo" />
        <span className="font-display text-3xl font-semibold leading-none">{APP.name}</span>
        <span className="text-sm font-extrabold uppercase tracking-widest text-gold">{APP.gateLine}</span>
        <span className="splash-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="text-sm font-bold text-muted">{APP.gateNote}</span>
        <PvCredit />
      </span>
    </button>
  );
}

function PvCredit({ className = "" }: { className?: string }) {
  return (
    <span className={cn("pv-credit", className)}>
      <span>A product of</span>
      <strong>PROMISEVISUALS</strong>
      <span aria-hidden="true">·</span>
      <span className="pv-flag" aria-label="Nigeria"><i /><i /><i /></span>
      <span>Made in Nigeria</span>
    </span>
  );
}

function TopBar({ onHelp }: { onHelp: () => void }) {
  const screen = useQuiz((s) => s.screen);
  const name = useQuiz((s) => s.name);
  const role = useQuiz((s) => s.role);
  const voiceOn = useQuiz((s) => s.voiceOn);
  const toggleVoice = useQuiz((s) => s.toggleVoice);
  const park = useQuiz((s) => s.park);
  const go = useQuiz((s) => s.go);
  const shopForced = useQuiz((s) => s.shopForced);
  const onTrail = screen !== "camp";

  return (
    <header className="trail-bar flex flex-nowrap items-center justify-between gap-2">
      <button type="button" className="flex shrink-0 items-center gap-3" onClick={() => park(name ? "map" : "camp")}>
        <span className="logo-plate">
          <img src={APP.mark} alt="" />
        </span>
        <span className="text-left">
          <span className="block font-display text-xl font-semibold leading-none">{APP.name}</span>
          <span className="hidden text-sm text-muted sm:block">{APP.tagline}</span>
        </span>
      </button>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {role === "owner" && (
          <button
            type="button"
            onClick={() => go("command")}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-gold px-3 text-sm font-extrabold text-gold"
          >
            <Shield className="size-4" aria-hidden />
            Command
          </button>
        )}
        {onTrail && !shopForced && (
          <button
            type="button"
            onClick={() => park(screen === "map" ? "camp" : "map")}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line px-3 text-sm font-extrabold"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {screen === "map" ? "Camp" : "Trail"}
          </button>
        )}
        <button
          type="button"
          onClick={onHelp}
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-line"
          aria-label="Help map"
        >
          <CircleHelp className="size-5" />
        </button>
        <ShareQuizyButton />
        <button
          type="button"
          aria-pressed={voiceOn}
          onClick={() => {
            if (voiceOn) stopSpeak();
            toggleVoice();
          }}
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-line"
          aria-label={voiceOn ? "Turn voice off" : "Turn voice on"}
        >
          {voiceOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
        <AccountChip />
      </div>
    </header>
  );
}

function AccountChip() {
  const { user, pending } = useQuizSession();
  const [busy, setBusy] = useState(false);
  if (pending) return null;
  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex min-h-11 items-center rounded-2xl bg-primary px-3 text-sm font-extrabold text-primary-fg"
      >
        Sign in
      </Link>
    );
  }
  const label = user.email ?? "Account";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        signOut()
          .catch(() => {})
          .finally(() => setBusy(false));
      }}
      className="inline-flex min-h-11 max-w-44 items-center truncate rounded-2xl border border-line px-3 text-sm font-extrabold"
      title={`Sign out of this ${APP.name} account`}
    >
      {busy ? "Signing out" : label}
    </button>
  );
}

function ResumeCard() {
  const round = useQuiz((s) => s.round);
  const shopForced = useQuiz((s) => s.shopForced);
  const go = useQuiz((s) => s.go);
  const abandon = useQuiz((s) => s.abandon);
  if (!round) return null;
  return (
    <div className="mt-4 rounded-card border border-gold bg-surface p-4">
      <p className="text-sm font-extrabold uppercase tracking-widest text-gold">Still open</p>
      <p className="mt-1 font-display text-2xl font-semibold">{round.title}</p>
      <p className="text-muted">
        Question {round.index + 1} of {round.items.length}. Leave or refresh and this question stays.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => go(shopForced ? "shop" : "play")}
          className="min-h-11 rounded-2xl bg-primary px-4 font-extrabold text-primary-fg"
        >
          Open this question
        </button>
        <button type="button" onClick={abandon} className="min-h-11 rounded-2xl border border-line px-4 font-extrabold">
          Stop this round
        </button>
      </div>
    </div>
  );
}

function Inbox() {
  const { user } = useQuizSession();
  const [rows, setRows] = useState<QuizMessage[]>([]);
  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }
    listMessages(user.id)
      .then((notes) => setRows(notes.slice(0, 2)))
      .catch(() => setRows([]));
  }, [user?.id]);
  if (!user || rows.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {rows.map((row) => (
        <article key={row.id} className="rounded-2xl border border-gold bg-surface px-4 py-3">
          <p className="text-sm font-extrabold uppercase tracking-widest text-gold">{row.subject}</p>
          <p className="mt-1 text-sm leading-relaxed">{row.message}</p>
          <button
            type="button"
            onClick={() => {
              acknowledgeMessage(row.id)
                .then(() => setRows((current) => current.filter((item) => item.id !== row.id)))
                .catch(() => {});
            }}
            className="mt-2 text-sm font-extrabold text-muted"
          >
            Read
          </button>
        </article>
      ))}
    </div>
  );
}

function InstallButton() {
  const [prompt, setPrompt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (!prompt) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void prompt.prompt();
        setPrompt(null);
      }}
      className="mt-4 inline-flex min-h-11 items-center rounded-2xl border border-line px-4 font-extrabold"
    >
      Add {APP.name} to this device
    </button>
  );
}

function Stats() {
  const lives = useQuiz((s) => s.lives);
  const coins = useQuiz((s) => s.coins);
  const streak = useQuiz((s) => s.streak);
  const hints = useQuiz((s) => s.hints);
  const screen = useQuiz((s) => s.screen);
  const round = useQuiz((s) => s.round);
  const go = useQuiz((s) => s.go);
  const useHint = useQuiz((s) => s.useHint);

  const pills: { label: string; value: string; icon: LucideIcon; onClick: () => void }[] = [
    { label: "Lives", value: String(lives), icon: Heart, onClick: () => go("shop") },
    { label: "Coins", value: String(coins), icon: Coins, onClick: () => go("shop") },
    { label: "Streak", value: String(streak), icon: Flame, onClick: () => go("badges") },
    {
      label: "Hints",
      value: String(hints),
      icon: Lightbulb,
      onClick: () => {
        if (screen === "play" && round && round.mode !== "battle" && round.mode !== "daily" && round.mode !== "weekly") useHint();
        else go("shop");
      },
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {pills.map((pill) => (
        <button
          key={pill.label}
          type="button"
          onClick={pill.onClick}
          className="stat-pill rounded-2xl border border-line px-2 py-2 text-left"
        >
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted">
            <pill.icon className="size-3.5 text-gold" aria-hidden />
            {pill.label}
          </span>
          <span className="mt-1 block font-display text-xl font-semibold leading-none">{pill.value}</span>
        </button>
      ))}
    </div>
  );
}

function Camp({ flags }: { flags: PublicFlags }) {
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

  return (
    <section className="camp-compact mx-auto w-full max-w-xl">
      <form
        className="rounded-card border border-line bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault();
          begin();
        }}
      >
        <div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wide text-muted" htmlFor="explorer">
              {APP.playerLabel}
            </label>
            <input
              id="explorer"
              value={name}
              maxLength={24}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-base font-bold text-fg"
            />
          </div>
        </div>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-muted">Level</p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {AGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={age === item.id}
              onClick={() => setAge(item.id)}
              className={cn("min-h-10 rounded-xl border px-3 text-sm font-extrabold", age === item.id ? "border-gold bg-surface-2 text-fg" : "border-line text-muted")}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-muted">Difficulty</p>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {LEVELS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={difficulty === item.id}
              onClick={() => setDifficulty(item.id)}
              className={cn(
                "min-h-10 rounded-xl border px-1 text-[0.8rem] font-extrabold",
                difficulty === item.id ? "border-primary bg-primary text-primary-fg" : "border-line text-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {difficulty === "advanced" && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {ADVANCED_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={challenge === mode}
                onClick={() => setChallenge(mode)}
                className={cn("min-h-9 rounded-xl border px-2 text-left text-xs font-extrabold", challenge === mode ? "border-gold bg-surface-2 text-fg" : "border-line text-muted")}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
        <ResumeCard />
        {!flags.registrationsEnabled && <p className="mt-2 text-xs text-muted">New accounts are paused. Explorers who already have an account can still sign in.</p>}
        <button
          type="submit"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 py-2 text-lg font-extrabold text-primary-fg"
        >
          {round ? "Open this question" : "Set out"}
        </button>
      </form>
      <div className="camp-extras mt-3">
        <Inbox />
        <InstallButton />
        <ShareQuizyButton variant="card" />
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="text-center text-sm font-extrabold text-primary underline">
          Parents: questions or ideas? Chat with us on WhatsApp
        </a>
      </div>
    </section>
  );
}

const LAND_BLURBS: Record<string, string> = APP.blurbs;

function landArt(id: string) {
  return landArtFor(id);
}

type TrailTab = "lands" | "weekly" | "games" | "more";

function Trail({ flags }: { flags: PublicFlags }) {
  const name = useQuiz((s) => s.name);
  const landDone = useQuiz((s) => s.landDone);
  const landCorrect = useQuiz((s) => s.landCorrect);
  const totalStars = useQuiz((s) => s.totalStars);
  const round = useQuiz((s) => s.round);
  const go = useQuiz((s) => s.go);
  const [tab, setTab] = useState<TrailTab>("lands");
  const visible = lands.filter((land) =>
    land.id === "news" ? flags.featureNews : land.id === "sports" ? flags.featureSports : true,
  );
  const cleared = visible.filter((land) => landDone[land.id]).length;
  const pct = visible.length ? Math.round((cleared / visible.length) * 100) : 0;

  const tabs: { id: TrailTab; label: string; icon: LucideIcon }[] = [
    { id: "lands", label: IS_KINGS ? "Sections" : "Lands", icon: MapIcon },
    { id: "weekly", label: "Weekly", icon: Medal },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "more", label: "More", icon: Sparkles },
  ];

  return (
    <section className="trail">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="trail-ring" style={{ "--pct": `${pct}%` } as React.CSSProperties} aria-hidden>
            <span>{cleared}</span>
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-gold">{name || APP.playerFallback}</p>
            <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{APP.trailTitle}</h2>
            <p className="text-sm text-muted">
              {cleared} of {visible.length} {APP.landsWord} · {totalStars} {totalStars === 1 ? "star" : "stars"}
            </p>
          </div>
        </div>
        <Stats />
      </div>
      {round && <ResumeCard />}
      <div className="trail-tabs mt-3" role="tablist" aria-label="Trail sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn("trail-tab", tab === item.id && "is-active")}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
            {item.id === "weekly" && <span className="trail-new">New</span>}
          </button>
        ))}
      </div>
      <div key={tab} className="tab-in mt-3">
        {tab === "lands" && <LandPicker lands={visible} landDone={landDone} landCorrect={landCorrect} />}
        {tab === "weekly" && <WeeklyBanner />}
        {tab === "games" && <GameCorner />}
        {tab === "more" && (
          <div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ...(flags.featureDaily ? [{ label: "Daily challenge", icon: CalendarDays, screen: "daily" as const }] : []),
                ...(flags.featureAcademy ? [{ label: "Academy", icon: BookOpen, screen: "academy" as const }] : []),
                { label: "Badges", icon: Award, screen: "badges" as const },
                { label: "Leaderboard", icon: Trophy, screen: "board" as const },
                ...(flags.featureBattle ? [{ label: "Play online", icon: Wifi, screen: "battle" as const }] : []),
                { label: "Shop", icon: Coins, screen: "shop" as const },
              ].map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => go(item.screen)}
                  className="more-tile stagger-item"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <item.icon className="size-6 text-gold" aria-hidden />
                  {item.label}
                </button>
              ))}
            </div>
            <Duel />
          </div>
        )}
      </div>
    </section>
  );
}

function LandPicker({
  lands: list,
  landDone,
  landCorrect,
}: {
  lands: typeof lands;
  landDone: Record<string, boolean>;
  landCorrect: Record<string, number>;
}) {
  const startLandNow = useQuiz((s) => s.startLand);
  // lands with topics (like Sports) ask what to play first
  const [asking, setAsking] = useState<string | null>(null);
  const startLand = (id: string) => (topicsFor(id).length ? setAsking(id) : startLandNow(id));
  const firstOpen = list.find((land) => !landDone[land.id]) ?? list[0];
  const [picked, setPicked] = useState(firstOpen?.id ?? "");
  const [spinning, setSpinning] = useState(false);
  const land = list.find((item) => item.id === picked) ?? list[0];

  const surprise = () => {
    if (spinning || list.length === 0) return;
    const pool = list.filter((item) => !landDone[item.id]);
    const from = pool.length ? pool : list;
    const target = from[Math.floor(Math.random() * from.length)];
    if (!target) return;
    setSpinning(true);
    let hops = 0;
    const id = window.setInterval(() => {
      hops += 1;
      const hop = list[Math.floor(Math.random() * list.length)];
      if (hop) setPicked(hop.id);
      if (hops >= 9) {
        window.clearInterval(id);
        setPicked(target.id);
        setSpinning(false);
      }
    }, 90);
  };

  if (!land) return null;
  const best = landCorrect[land.id] ?? 0;
  const done = !!landDone[land.id];

  return (
    <div className="land-picker">
      {asking ? (
        <TopicPicker
          landId={asking}
          landName={list.find((item) => item.id === asking)?.name ?? ""}
          onClose={() => setAsking(null)}
          onStart={(pick) => {
            setAsking(null);
            startLandNow(asking, pick);
          }}
        />
      ) : null}
      <div className={cn("land-spotlight", done && "is-cleared")} aria-live="polite">
        <span className={cn("land-emblem is-big", `land-${land.id}`, done && "is-cleared")}>
          <img src={landArt(land.id)} alt="" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-widest text-gold">
            {done ? "Cleared" : "Ready"} · best {best}/{land.count}
          </p>
          <h3 className="truncate font-display text-2xl font-semibold leading-tight">{land.name}</h3>
          <p className="spotlight-blurb text-sm text-muted">{LAND_BLURBS[land.id] ?? "Ten questions. Lives on the line."}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => startLand(land.id)}
              disabled={spinning}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-extrabold text-primary-fg"
            >
              <PlayIcon className="size-4" aria-hidden /> {done ? "Play again" : "Start"}
            </button>
            <button
              type="button"
              onClick={surprise}
              className={cn("inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 font-extrabold", spinning && "is-rolling")}
              aria-label={`Surprise me: pick a ${APP.landWord} for me`}
            >
              <Dices className="size-5 text-gold" aria-hidden />
              <span className="hidden sm:inline">Surprise me</span>
            </button>
          </div>
        </div>
      </div>
      <div className="land-bubbles" role="listbox" aria-label={`Choose a ${APP.landWord}`}>
        {list.map((item, index) => {
          const score = landCorrect[item.id] ?? 0;
          const isDone = !!landDone[item.id];
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === land.id}
              onClick={() => setPicked(item.id)}
              onDoubleClick={() => startLand(item.id)}
              className={cn("land-bubble stagger-item", item.id === land.id && "is-picked", isDone && "is-cleared")}
              style={{ animationDelay: `${index * 30}ms`, "--pct": `${Math.min(100, (score / item.count) * 100)}%` } as React.CSSProperties}
            >
              <span className={cn("land-emblem is-small", `land-${item.id}`)}>
                <img src={landArt(item.id)} alt="" />
              </span>
              {isDone && <span className="bubble-check" aria-hidden>✓</span>}
              <span className="bubble-name">{item.name.replace(" (2026)", "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GameCorner() {
  const go = useQuiz((s) => s.go);
  const best = useQuiz((s) => s.arcadeBest);
  const games = [
    {
      id: "snake" as const,
      name: "Word Snake",
      art: "/art/games/snake.svg",
      note: "Eat the letters of the word in order. Four levels; on Hard the word hides and you spell it from memory.",
      best: best.snake ? `Best: ${best.snake} ${best.snake === 1 ? "word" : "words"}` : "New game!",
    },
    {
      id: "label" as const,
      name: "Label Lab",
      art: "/art/games/label.svg",
      note: "Label the picture before the clock runs out. Every stage brings new parts to learn, from your face to the heart, the brain and volcanoes.",
      best: best.label ? `Best: stage ${best.label}` : "New game!",
    },
    {
      id: "memory" as const,
      name: "Memory Match",
      art: "/art/games/memory.svg",
      note: "Find the matching pairs. Four levels, and more cards every round.",
      best: best.memory ? `Best: ${"★".repeat(best.memory)}` : "New game!",
    },
  ];
  return (
    <div className="grid gap-4">
      <FunGames />
      {APP.learningGames && <div>
        <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-gold">Learning games · always open</p>
        <div className="game-corner grid gap-3 sm:grid-cols-3">      {games.map((game, index) => (
        <button
          key={game.id}
          type="button"
          onClick={() => go(game.id)}
          className="game-card stagger-item"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <span className="land-emblem is-big game-emblem">
            <img src={game.art} alt="" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-xs font-extrabold uppercase tracking-widest text-gold">{game.best}</span>
            <span className="block font-display text-2xl font-semibold leading-tight">{game.name}</span>
            <span className="block text-sm text-muted">{game.note}</span>
            <span className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-2xl bg-primary px-4 font-extrabold text-primary-fg">
              <PlayIcon className="size-4" aria-hidden /> Play
            </span>
          </span>
        </button>
      ))}
      <p className="col-span-full text-sm text-muted">Every finished game earns coins for lives and hints. Pick Easy to Expert inside each game.</p>
        </div>
      </div>}
    </div>
  );
}

/** Brick Drop, WHOT, Sweet Swap and Bouncy Ball: unlocked by passing lands, played with tickets. */
function FunGames() {
  const go = useQuiz((s) => s.go);
  const landCorrect = useQuiz((s) => s.landCorrect);
  const tickets = useQuiz((s) => s.tickets);
  const owner = useQuiz((s) => s.role === "owner");
  const best = useQuiz((s) => s.arcadeBest);
  const passed = passedLands(landCorrect, lands);
  const [note, setNote] = useState("");
  const bestText: Record<string, string> = {
    bricks: best.bricks ? `Best: ${best.bricks} lines` : "New!",
    whot: best["whot-wins"] ? `Won ${best["whot-wins"]} ${best["whot-wins"] === 1 ? "game" : "games"}` : "New!",
    match: best.match ? `Best: level ${best.match}` : "New!",
    bounce: best.bounce ? `Reached level ${Math.min(best.bounce, 8)}` : "New!",
  };
  return (
    <section className="fun-games" aria-label="Fun games">
      <div className="fun-head">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-widest text-gold">Fun games · earned by learning</p>
          <p className="text-sm text-muted">
            Score {passMark(10)}/10 or more on a {APP.landWord} to earn 3 game tickets. Each pass of a new {APP.landWord} unlocks another game.
          </p>
        </div>
        <span className="fun-tickets" aria-label={owner ? "Owner: free play" : `${tickets} game tickets`}>
          <Ticket className="size-5" aria-hidden />
          <b>{owner ? "Free" : tickets}</b>
          <small>{owner ? "owner" : tickets === 1 ? "ticket" : "tickets"}</small>
        </span>
      </div>
      <div className="fun-grid">
        {FUN_GAMES.map((game, index) => {
          const access = gameAccess(game, passed, tickets, owner);
          const locked = !access.open && access.reason === "locked";
          return (
            <button
              key={game.id}
              type="button"
              className={cn("fun-card stagger-item", locked && "is-locked")}
              style={{ animationDelay: `${index * 60}ms` }}
              onClick={() => {
                if (access.open) go(game.id);
                else if (access.reason === "locked")
                  setNote(`${game.name} opens when you pass ${game.needLands} different ${game.needLands === 1 ? APP.landWord : APP.landsWord} with ${passMark(10)}/10 or more. You've passed ${passed}.`);
                else setNote(`No game tickets left. Play a ${APP.landWord} and score 7/10 or more to earn 3 more.`);
              }}
              aria-label={`${game.name}${locked ? ", locked" : ""}`}
            >
              <span className="fun-art">
                <img src={game.art} alt="" />
                {locked ? (
                  <span className="fun-lock">
                    <Lock className="size-5" aria-hidden />
                    {passed}/{game.needLands}
                  </span>
                ) : null}
              </span>
              <span className="block font-display text-lg font-semibold leading-tight">{game.name}</span>
              <span className="block text-xs font-bold text-muted">
                {locked ? `Pass ${game.needLands} ${game.needLands === 1 ? APP.landWord : APP.landsWord} to open` : bestText[game.id]}
              </span>
              <span className="fun-note text-xs text-muted">{game.note}</span>
            </button>
          );
        })}
      </div>
      {note ? (
        <p className="fun-msg" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
}



function WeeklyBanner() {
  const weekly = useQuiz((s) => s.weekly);
  const startWeekly = useQuiz((s) => s.startWeekly);
  const go = useQuiz((s) => s.go);
  const done = weekly?.week === weekKey() ? weekly : null;
  return (
    <button
      type="button"
      onClick={() => (done ? go("weekly") : startWeekly())}
      className="flex w-full items-center gap-3 rounded-card border-2 border-gold bg-surface p-4 text-left"
    >
      <Medal className="size-8 shrink-0 text-gold" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl font-semibold">This week's challenge</span>
        <span className="block text-sm text-muted">
          {done
            ? `You scored ${done.correct}/${done.total}. Share your card and dare a friend.`
            : "Ten questions, the same for every explorer. Score it, share it."}
        </span>
      </span>
      <span className="shrink-0 rounded-2xl bg-gold px-3 py-2 text-sm font-extrabold text-gold-fg">{done ? "My card" : "Play"}</span>
    </button>
  );
}

function Duel() {
  const startBattle = useQuiz((s) => s.startBattle);
  const [open, setOpen] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-extrabold"
      >
        <Swords className="size-4 text-gold" aria-hidden />
        Pass-and-play duel
      </button>
    );
  }

  return (
    <form
      className="mt-4 grid gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        startBattle(p1, p2);
      }}
    >
      <input
        value={p1}
        onChange={(event) => setP1(event.target.value)}
        placeholder="Player one"
        aria-label="Player one"
        className="min-h-11 rounded-2xl border border-line bg-surface-2 px-3 font-bold text-fg"
      />
      <input
        value={p2}
        onChange={(event) => setP2(event.target.value)}
        placeholder="Player two"
        aria-label="Player two"
        className="min-h-11 rounded-2xl border border-line bg-surface-2 px-3 font-bold text-fg"
      />
      <button type="submit" className="min-h-11 rounded-2xl bg-gold px-4 font-extrabold text-gold-fg">
        Start duel
      </button>
    </form>
  );
}

function Play() {
  const round = useQuiz((s) => s.round);
  const voiceOn = useQuiz((s) => s.voiceOn);
  const answerChoice = useQuiz((s) => s.answerChoice);
  const submitSpell = useQuiz((s) => s.submitSpell);
  const next = useQuiz((s) => s.next);
  const battlePick = useQuiz((s) => s.battlePick);
  const battleAdvance = useQuiz((s) => s.battleAdvance);
  const [draft, setDraft] = useState("");

  const item = round?.items[round.index];

  useEffect(() => {
    setDraft("");
  }, [round?.index, round?.mode]);

  useEffect(() => {
    if (!voiceOn || !item || round?.revealed) return;
    if (item.kind === "spell") speak(item.word);
  }, [voiceOn, item, round?.index, round?.revealed, round?.phase]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
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
    return <p className="text-muted">The trail is quiet. Head back and pick a land.</p>;
  }

  if (round.mode === "battle" && round.phase === "pass") {
    return (
      <section className="mx-auto max-w-xl rounded-card border border-line bg-surface p-6 text-center">
        <p className="text-sm font-extrabold uppercase tracking-widest text-gold">Pass the device</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">{round.p2Name}, you are up</h2>
        <p className="mt-2 text-muted">Do not peek at the first answer.</p>
        <button
          type="button"
          onClick={battleAdvance}
          className="mt-6 min-h-12 w-full rounded-2xl bg-primary font-extrabold text-primary-fg"
        >
          I am ready
        </button>
      </section>
    );
  }

  const progress = ((round.index + (round.revealed ? 1 : 0)) / round.items.length) * 100;
  const asking =
    round.mode === "battle"
      ? round.phase === "p2"
        ? round.p2Name
        : round.p1Name
      : null;

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3 text-sm font-extrabold text-muted">
        <span>{round.title}</span>
        <span>
          {round.index + 1} / {round.items.length}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="progress-fill h-full bg-gold" style={{ width: `${progress}%` }} />
      </div>
      {round.mode !== "battle" && round.mode !== "daily" && round.mode !== "weekly" && round.mode !== "academy" && (
        <div className="mt-4">
          <Stats />
        </div>
      )}
      {asking && <p className="mt-4 text-sm font-extrabold uppercase tracking-widest text-gold">{asking}</p>}
      {item.kind === "choice" ? (
        <ChoiceCard
          item={item}
          round={round}
          voiceOn={voiceOn}
          onPick={(index) => (round.mode === "battle" ? battlePick(index) : answerChoice(index))}
        />
      ) : (
        <form
          className="mt-6"
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            if (!round.revealed) submitSpell(draft);
          }}
        >
          <h2 className="font-display text-3xl font-semibold leading-tight">Spell the word</h2>
          <p className="mt-2 text-muted">{item.hint}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => speak(item.word)}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line px-4 font-extrabold"
            >
              <Volume2 className="size-4" aria-hidden />
              Hear it
            </button>
          </div>
          <input
            key={item.id}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            // a plain text box: the letters stay visible and no "save password" prompt appears
            type="text"
            name="quizy-spell-attempt"
            lang="zxx"
            inputMode="text"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Your spelling"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            disabled={round.revealed}
            className="spell-plain mt-4 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-2xl font-bold text-fg"
          />
          {round.revealed && (
            <p className={cn("mt-3 font-extrabold", draft.trim().toLowerCase() === item.word.toLowerCase() ? "text-good" : "text-bad")}>
              {draft.trim().toLowerCase() === item.word.toLowerCase() ? "Correct." : `The spelling is ${item.word}.`}
            </p>
          )}
          {!round.revealed && (
            <button type="submit" className="mt-4 min-h-12 w-full rounded-2xl bg-primary font-extrabold text-primary-fg">
              Check spelling
            </button>
          )}
        </form>
      )}
      {round.revealed && round.mode !== "battle" && (
        <button
          type="button"
          onClick={next}
          className="mt-4 min-h-12 w-full rounded-2xl bg-gold font-extrabold text-gold-fg"
        >
          {round.index === round.items.length - 1 ? "Finish" : "Next question"}
        </button>
      )}
      {round.mode === "battle" && round.phase === "reveal" && item.kind === "choice" && (
        <div className="mt-4">
          <p className="text-muted">
            {round.p1Name} {round.p1Pick === item.a ? "correct" : "missed"} · {round.p2Name}{" "}
            {round.picks[round.index] === item.a ? "correct" : "missed"}
          </p>
          <p className="mt-1 font-extrabold">
            {round.p1Score} — {round.p2Score}
          </p>
          <button
            type="button"
            onClick={battleAdvance}
            className="mt-4 min-h-12 w-full rounded-2xl bg-gold font-extrabold text-gold-fg"
          >
            {round.index === round.items.length - 1 ? "See the result" : "Next round"}
          </button>
        </div>
      )}
    </section>
  );
}

function ChoiceCard({
  item,
  round,
  voiceOn,
  onPick,
}: {
  item: Extract<PlayItem, { kind: "choice" }>;
  round: Round;
  voiceOn: boolean;
  onPick: (index: number) => void;
}) {
  const locked = round.mode === "battle" ? round.phase === "reveal" || round.phase === "pass" : round.revealed;
  const picked = round.mode === "battle" && round.phase === "reveal" ? round.picks[round.index] : round.picks[round.index];

  return (
    <div className="mt-6">
      {item.media && item.media.items.length > 0 && (
        <div className="mb-4 rounded-card border border-line bg-surface p-4">
          <p className="text-sm font-extrabold text-muted">{item.media.title}</p>
          <ul className="mt-3 space-y-2">
            {item.media.items.map(([label, value]) => {
              const max = Math.max(...item.media!.items.map((row) => Number(row[1]) || 0), 1);
              return (
                <li key={label}>
                  <div className="mb-1 flex justify-between text-sm font-bold">
                    <span>{label}</span>
                    <span className="text-muted">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(Number(value) / max) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-3xl font-semibold leading-tight">{item.q}</h2>
        {voiceOn && (
          <button
            type="button"
            onClick={() => speak(item.q)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-line"
            aria-label="Hear the question"
          >
            <Volume2 className="size-5" />
          </button>
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {item.opts.map((option, index) => {
          const hidden = item.hidden.includes(index);
          const isPick = picked === index;
          const show = locked && round.mode !== "battle" ? true : round.mode === "battle" && round.phase === "reveal";
          const correct = show && index === item.a;
          const wrongPick = show && isPick && index !== item.a;
          return (
            <button
              key={`${item.id}-${index}`}
              type="button"
              disabled={hidden || locked}
              onClick={() => onPick(index)}
              className={cn(
                "stagger-item flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-lg font-extrabold",
                hidden && "invisible",
                correct && "border-good bg-surface-2 text-good",
                wrongPick && "border-bad text-bad",
                !correct && !wrongPick && "border-line bg-surface",
              )}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="keycap">{String.fromCharCode(65 + index)}</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {round.revealed && round.mode !== "battle" && item.exp && (
        <p className="mt-4 rounded-2xl border border-line bg-surface-2 px-4 py-3 leading-relaxed text-muted">{item.exp}</p>
      )}
    </div>
  );
}

function Shop() {
  const coins = useQuiz((s) => s.coins);
  const lives = useQuiz((s) => s.lives);
  const hints = useQuiz((s) => s.hints);
  const shopForced = useQuiz((s) => s.shopForced);
  const buyLife = useQuiz((s) => s.buyLife);
  const refillHints = useQuiz((s) => s.refillHints);
  const openBonus = useQuiz((s) => s.openBonus);
  const abandon = useQuiz((s) => s.abandon);
  const go = useQuiz((s) => s.go);

  return (
    <section className="mx-auto max-w-xl">
      <h2 className="font-display text-3xl font-semibold">{shopForced ? "Out of lives" : "Camp shop"}</h2>
      <p className="mt-2 text-muted">
        {shopForced
          ? "Buy a life, earn one with a bonus question, or leave this land."
          : "Lives cost 10 coins. A full set of hints costs 20."}
      </p>
      <div className="mt-4">
        <Stats />
      </div>
      <div className="mt-4 grid gap-3">
        <button
          type="button"
          disabled={lives >= 3 || coins < 10}
          onClick={buyLife}
          className="min-h-14 rounded-2xl bg-primary px-4 text-left font-extrabold text-primary-fg disabled:opacity-45"
        >
          <Heart className="mr-2 inline size-4" aria-hidden />
          Buy a life · 10 coins
        </button>
        <button
          type="button"
          disabled={hints >= 3 || coins < 20}
          onClick={refillHints}
          className="min-h-14 rounded-2xl border border-line bg-surface px-4 text-left font-extrabold disabled:opacity-45"
        >
          <Lightbulb className="mr-2 inline size-4 text-gold" aria-hidden />
          Refill hints · 20 coins
        </button>
        {shopForced && (
          <button
            type="button"
            onClick={openBonus}
            className="min-h-14 rounded-2xl bg-gold px-4 text-left font-extrabold text-gold-fg"
          >
            Bonus question for a life
          </button>
        )}
        {shopForced ? (
          <button type="button" onClick={abandon} className="min-h-12 rounded-2xl border border-line font-extrabold">
            Leave this land
          </button>
        ) : (
          <button type="button" onClick={() => go("map")} className="min-h-12 rounded-2xl border border-line font-extrabold">
            Back to the trail
          </button>
        )}
      </div>
    </section>
  );
}

function Bonus() {
  const bonus = useQuiz((s) => s.bonus);
  const bonusPick = useQuiz((s) => s.bonusPick);
  const bonusRevealed = useQuiz((s) => s.bonusRevealed);
  const answerBonus = useQuiz((s) => s.answerBonus);
  const leaveBonus = useQuiz((s) => s.leaveBonus);
  if (!bonus || bonus.kind !== "choice") return null;
  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-sm font-extrabold uppercase tracking-widest text-gold">Bonus</p>
      <h2 className="mt-2 font-display text-3xl font-semibold leading-tight">{bonus.q}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {bonus.opts.map((option, index) => {
          const correct = bonusRevealed && index === bonus.a;
          const wrong = bonusRevealed && bonusPick === index && index !== bonus.a;
          return (
            <button
              key={option}
              type="button"
              disabled={bonusRevealed}
              onClick={() => answerBonus(index)}
              className={cn(
                "min-h-14 rounded-2xl border px-4 py-3 text-left text-lg font-extrabold",
                correct && "border-good text-good",
                wrong && "border-bad text-bad",
                !correct && !wrong && "border-line bg-surface",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {bonusRevealed && (
        <button
          type="button"
          onClick={leaveBonus}
          className="mt-4 min-h-12 w-full rounded-2xl bg-gold font-extrabold text-gold-fg"
        >
          Continue
        </button>
      )}
    </section>
  );
}

function Break() {
  const card = useQuiz((s) => s.breakCard);
  const shown = useQuiz((s) => s.breakShown);
  const revealBreak = useQuiz((s) => s.revealBreak);
  const continueBreak = useQuiz((s) => s.continueBreak);
  const ticketNote = useQuiz((s) => s.ticketNote);
  const clearTicketNote = useQuiz((s) => s.clearTicketNote);
  if (!card) return null;
  return (
    <section className="mx-auto max-w-xl rounded-card border border-line bg-surface p-6">
      {ticketNote ? (
        <p className={cn("ticket-note", ticketNote.includes("+") && "is-earned")}>
          <Ticket className="size-5 shrink-0" aria-hidden />
          <span>{ticketNote}</span>
        </p>
      ) : null}
      <p className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-gold">
        <Tent className="size-4" aria-hidden />
        Brain break
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight">{card.text}</h2>
      {shown ? (
        <p className="mt-4 leading-relaxed text-muted">{card.answer}</p>
      ) : (
        <button
          type="button"
          onClick={revealBreak}
          className="mt-6 min-h-12 w-full rounded-2xl bg-primary font-extrabold text-primary-fg"
        >
          Show the answer · 3 coins
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          clearTicketNote();
          continueBreak();
        }}
        className="mt-3 min-h-12 w-full rounded-2xl border border-line font-extrabold"
      >
        Onward
      </button>
    </section>
  );
}

function Badges() {
  const earned = useQuiz((s) => s.badges);
  const best = useQuiz((s) => s.bestStreak);
  return (
    <section>
      <h2 className="font-display text-3xl font-semibold">Badges</h2>
      <p className="mt-1 text-muted">Best streak on this device: {best}.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {BADGES.map((badge) => {
          const has = earned.includes(badge.id);
          return (
            <li key={badge.id} className={cn("rounded-card border p-4", has ? "border-gold bg-surface" : "border-line")}>
              <p className="flex items-center gap-2 font-extrabold">
                <Award className={cn("size-4", has ? "text-gold" : "text-muted")} aria-hidden />
                {badge.name}
              </p>
              <p className="mt-1 text-sm text-muted">{has ? badge.detail : "Still locked."}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Daily() {
  const dailyDone = useQuiz((s) => s.dailyDone);
  const dailyDate = useQuiz((s) => s.dailyDate);
  const dailyScore = useQuiz((s) => s.dailyScore);
  const startDaily = useQuiz((s) => s.startDaily);
  const done = dailyDone && dailyDate === todayKey();
  return (
    <section className="mx-auto max-w-xl">
      <p className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-gold">
        <CalendarDays className="size-4" aria-hidden />
        Today
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold">Daily challenge</h2>
      <p className="mt-2 leading-relaxed text-muted">
        Five questions, seeded for this calendar day. Finish them for 75 coins. Lives stay out of it.
      </p>
      {done ? (
        <p className="mt-4 rounded-2xl border border-gold bg-surface px-4 py-3 font-extrabold">
          Done for today. Score {dailyScore} of 5. Come back tomorrow.
        </p>
      ) : (
        <button
          type="button"
          onClick={startDaily}
          className="mt-6 min-h-12 w-full rounded-2xl bg-primary font-extrabold text-primary-fg"
        >
          Begin today
        </button>
      )}
    </section>
  );
}

function Board() {
  const board = useQuiz((s) => s.board);
  return (
    <section className="mx-auto max-w-xl">
      <h2 className="font-display text-3xl font-semibold">Device board</h2>
      <p className="mt-2 text-muted">Names are saved on this device when the full trail is finished.</p>
      {board.length === 0 ? (
        <p className="mt-6 rounded-card border border-line bg-surface p-4 text-muted">No completed trails yet.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {board.map((row, index) => (
            <li key={`${row.name}-${row.at}`} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
              <span className="font-extrabold">
                {index + 1}. {row.name}
              </span>
              <span className="text-muted">
                {row.stars} stars · {row.coins} coins
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Academy() {
  const startAcademy = useQuiz((s) => s.startAcademy);
  const subjects = academySubjects();
  return (
    <section>
      <p className="text-sm font-extrabold uppercase tracking-widest text-gold">Year 1 pilot</p>
      <h2 className="mt-1 font-display text-3xl font-semibold">Academy</h2>
      <p className="mt-2 max-w-2xl text-muted">
        A first bank for Nigerian primary Year 1 — maths, English, basic science, health, and creative arts. Six
        questions a sitting. No lives lost.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {subjects.map((subject) => (
          <button
            key={subject.subject}
            type="button"
            onClick={() => startAcademy(subject.subject)}
            className="rounded-card border border-line bg-surface p-4 text-left"
          >
            <span className="block font-display text-xl font-semibold">{subject.subject}</span>
            <span className="mt-1 block text-sm text-muted">{subject.count} questions in the bank</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Summary() {
  const note = useQuiz((s) => s.summaryNote);
  const park = useQuiz((s) => s.park);
  const go = useQuiz((s) => s.go);
  return (
    <section className="mx-auto max-w-xl rounded-card border border-gold bg-surface p-6 text-center">
      <Trophy className="mx-auto size-8 text-gold" aria-hidden />
      <h2 className="mt-3 font-display text-3xl font-semibold">Result</h2>
      <p className="mt-3 text-lg leading-relaxed">{note}</p>
      <button
        type="button"
        onClick={() => park("map")}
        className="mt-6 min-h-12 w-full rounded-2xl bg-primary font-extrabold text-primary-fg"
      >
        Back to the trail
      </button>
      <button
        type="button"
        onClick={() => go("snake")}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-gold bg-surface-2 font-extrabold"
      >
        <Gamepad2 className="size-5 text-gold" aria-hidden /> Bonus game: Word Snake
      </button>
      <QuickFeedback context="finished a land" />
    </section>
  );
}

function Certificate() {
  const name = useQuiz((s) => s.name);
  const totalStars = useQuiz((s) => s.totalStars);
  const coins = useQuiz((s) => s.coins);
  const bestStreak = useQuiz((s) => s.bestStreak);
  const park = useQuiz((s) => s.park);
  return (
    <section className="mx-auto max-w-xl rounded-card border-4 border-gold bg-surface p-8 text-center">
      <p className="text-sm font-extrabold uppercase tracking-widest text-gold">{IS_KINGS ? "King's Bible Quest" : "Quizy expedition"}</p>
      <h2 className="mt-2 font-display text-4xl font-semibold">{IS_KINGS ? "Bible Quest certificate" : "Trail certificate"}</h2>
      <p className="mt-4 text-lg">
        This certifies that <span className="font-extrabold">{name}</span> cleared every {APP.landWord}.
      </p>
      <p className="mt-2 text-muted">
        {totalStars} stars · {coins} coins · best streak {bestStreak}
      </p>
      <p className="mt-2 text-sm text-muted">{todayKey()}</p>
      <button
        type="button"
        onClick={() => park("map")}
        className="mt-6 min-h-12 w-full rounded-2xl bg-gold font-extrabold text-gold-fg"
      >
        Return to camp trail
      </button>
    </section>
  );
}
