/**
 * Two-player battles: online rooms (both apps) and Bluetooth (Quizy Android app).
 * Players choose the section, level, difficulty and length; both get the same questions,
 * see who won each question, and get rematch / change options at the end.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { battleCall, battlePlayerId, supabase, type BattleState } from "@/lib/quiz/cloud";
import { useQuiz } from "@/lib/quiz/store";
import { ADVANCED_MODES, type Age, type Difficulty } from "@/lib/quiz/logic";
import {
  BATTLE_COUNTS,
  MIX,
  battleLands,
  buildBattleQuestions,
  cleanSettings,
  defaultSettings,
  difficultyName,
  finalLine,
  landName,
  roundVerdict,
  type BattleQuestion,
  type BattleSettings,
} from "@/lib/quiz/battle";
import { APP, APP_ID, IS_KINGS } from "@/lib/app";

/** The Android app's download (published by the build-quizy-android workflow). */
export const ANDROID_APK_URL = "https://github.com/promisevisuals/quizy-online/releases/latest/download/Quizy.apk";

const SESSION = "quizyBattleSession";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

// ───────────────────────── shared model ─────────────────────────

type DuelPlayer = { id: string; name: string; score: number; me: boolean; active: boolean };
type DuelModel = {
  status: "lobby" | "playing" | "finished";
  round: number;
  total: number;
  players: DuelPlayer[];
  question: { q: string; opts: string[]; exp: string } | null;
  myPick: number | null;
  resolved: boolean;
  answer: number | null;
  picks: Record<string, number | null>;
  submitted: number;
  settings: BattleSettings & { by?: string };
};

type DuelActions = {
  answer: (index: number) => void;
  next: () => void;
  start: () => void;
  setup: (settings: BattleSettings, startNow: boolean) => void;
  leave: () => void;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function ageLabel(age: Age) {
  return age === "old" ? APP.ages.old : APP.ages.young;
}

function settingsLine(s: BattleSettings) {
  return [landName(s.landId), ageLabel(s.age), s.difficulty === "advanced" && s.mode ? s.mode : difficultyName(s.difficulty), `${s.count} questions`];
}

// ───────────────────────── entry ─────────────────────────

export function BattleRoom() {
  const [mode, setMode] = useState<"pick" | "online" | "bluetooth">("pick");
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("room");
    if (code) {
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url.toString());
      setInviteCode(code);
      setMode("online");
      return;
    }
    if (sessionStorage.getItem(SESSION)) setMode("online");
  }, []);

  if (mode === "online") return <OnlineBattle inviteCode={inviteCode} onBack={() => setMode("pick")} />;
  if (mode === "bluetooth") return <BluetoothBattle onBack={() => setMode("pick")} />;
  return (
    <section className="duel">
      <div className="duel-choice">
        <button type="button" className="duel-card is-online" onClick={() => setMode("online")}>
          <span className="duel-card-icon" aria-hidden>
            🌍
          </span>
          <b>Play online</b>
          <small>Make a room and send the code to a friend anywhere. Uses the internet.</small>
        </button>
        {!IS_KINGS && (
          <button type="button" className="duel-card is-bt" onClick={() => setMode("bluetooth")}>
            <span className="duel-card-icon" aria-hidden>
              📶
            </span>
            <b>Bluetooth (nearby)</b>
            <small>Two phones side by side with the Quizy Android app. No internet needed.</small>
          </button>
        )}
      </div>
    </section>
  );
}

// ───────────────────────── setup picker ─────────────────────────

function SetupPicker({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: BattleSettings;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (s: BattleSettings) => void;
  onCancel?: () => void;
}) {
  const [s, setS] = useState<BattleSettings>(initial);
  const list = useMemo(() => battleLands(), []);
  const set = (patch: Partial<BattleSettings>) => setS((cur) => cleanSettings({ ...cur, ...patch }));
  const levels: Difficulty[] = ["easy", "medium", "difficult", "advanced"];
  return (
    <div className="duel-setup">
      <p className="duel-label">1. {IS_KINGS ? "Section" : "Land"}</p>
      <div className="duel-lands">
        <button type="button" className={cx("duel-chip is-wide", s.landId === MIX && "is-on")} onClick={() => set({ landId: MIX })}>
          🎲 Mix of everything
        </button>
        {list.map((land) => (
          <button key={land.id} type="button" className={cx("duel-chip", s.landId === land.id && "is-on")} onClick={() => set({ landId: land.id })}>
            {land.name.replace(" (2026)", "")}
          </button>
        ))}
      </div>
      <p className="duel-label">2. Level</p>
      <div className="duel-row">
        {(["young", "old"] as Age[]).map((age) => (
          <button key={age} type="button" className={cx("duel-chip", s.age === age && "is-on")} onClick={() => set({ age })}>
            {ageLabel(age)}
          </button>
        ))}
      </div>
      <p className="duel-label">3. Difficulty</p>
      <div className="duel-row is-four">
        {levels.map((d) => (
          <button key={d} type="button" className={cx("duel-chip", s.difficulty === d && "is-on")} onClick={() => set({ difficulty: d, mode: d === "advanced" ? s.mode || "Beast Mode" : "" })}>
            {difficultyName(d)}
          </button>
        ))}
      </div>
      {s.difficulty === "advanced" && (
        <div className="duel-row is-wrap">
          {ADVANCED_MODES.map((m) => (
            <button key={m} type="button" className={cx("duel-chip is-small", s.mode === m && "is-on")} onClick={() => set({ mode: m })}>
              {m}
            </button>
          ))}
        </div>
      )}
      <p className="duel-label">4. How many questions</p>
      <div className="duel-row">
        {BATTLE_COUNTS.map((n) => (
          <button key={n} type="button" className={cx("duel-chip", s.count === n && "is-on")} onClick={() => set({ count: n })}>
            {n}
          </button>
        ))}
      </div>
      <div className="duel-actions">
        {onCancel && (
          <button type="button" className="duel-btn is-plain" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="button" className="duel-btn is-main" disabled={busy} onClick={() => onSubmit(s)}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── the board (both online and Bluetooth) ─────────────────────────

function DuelBoard({
  model,
  actions,
  busy,
  heading,
  invite,
  error,
}: {
  model: DuelModel;
  actions: DuelActions;
  busy: boolean;
  heading: string;
  invite?: ReactNode;
  error?: string;
}) {
  const go = useQuiz((s) => s.go);
  const park = useQuiz((s) => s.park);
  const [changing, setChanging] = useState(false);
  const verdictRef = useRef<HTMLDivElement | null>(null);
  const me = model.players.find((p) => p.me);
  const others = model.players.filter((p) => !p.me && p.active);
  const them = others[0];
  const ready = others.length >= 1;

  useEffect(() => {
    if (model.resolved) verdictRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [model.resolved, model.round]);

  const scoreboard = (
    <div className="duel-score">
      {[me, ...others].filter(Boolean).map((p) => (
        <div key={p!.id} className={cx("duel-score-cell", p!.me && "is-me")}>
          <span>{p!.me ? "You" : p!.name}</span>
          <b>{p!.score}</b>
        </div>
      ))}
      {!them && <div className="duel-score-cell is-wait"><span>Waiting…</span><b>–</b></div>}
    </div>
  );

  const settingsCard = (
    <div className="duel-what">
      <p className="duel-label">What you're playing</p>
      <div className="duel-tags">
        {settingsLine(model.settings).map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      {model.settings.by && <p className="duel-note">Chosen by {model.settings.by === me?.name ? "you" : model.settings.by}</p>}
    </div>
  );

  if (changing) {
    return (
      <section className="duel">
        <div className="duel-head">
          <div>
            <p className="duel-label">{heading}</p>
            <h2 className="duel-title">Choose what to play</h2>
          </div>
        </div>
        <SetupPicker
          initial={model.settings}
          busy={busy}
          submitLabel={model.status === "finished" && ready ? "Start this game" : "Save choice"}
          onCancel={() => setChanging(false)}
          onSubmit={(s) => {
            setChanging(false);
            actions.setup(s, model.status === "finished" && ready);
          }}
        />
      </section>
    );
  }

  return (
    <section className="duel">
      <div className="duel-head">
        <div>
          <p className="duel-label">{heading}</p>
          <h2 className="duel-title">
            {model.status === "lobby" ? (ready ? "Ready to play" : "Waiting for a friend") : model.status === "finished" ? "Final score" : `Question ${model.round + 1} of ${model.total}`}
          </h2>
        </div>
        <button type="button" className="duel-btn is-plain is-small" onClick={actions.leave}>
          Leave
        </button>
      </div>
      {scoreboard}

      {model.status === "lobby" && (
        <>
          {settingsCard}
          <button type="button" className="duel-btn is-plain is-wide" onClick={() => setChanging(true)}>
            Change {IS_KINGS ? "section" : "land"}, level or difficulty
          </button>
          {invite}
          <button type="button" className="duel-btn is-main is-wide" disabled={busy || !ready} onClick={actions.start}>
            {ready ? "Start the battle" : "Waiting for the other player to join…"}
          </button>
          {ready && <p className="duel-note">Either of you can start or change the game.</p>}
        </>
      )}

      {model.status === "playing" && model.question && (
        <div className="duel-play">
          <h3 className="duel-q">{model.question.q}</h3>
          <div className="duel-opts">
            {model.question.opts.map((opt, i) => {
              const isAnswer = model.resolved && model.answer === i;
              const mine = model.myPick === i;
              const wrongMine = model.resolved && mine && !isAnswer;
              const pickers = model.resolved ? model.players.filter((p) => model.picks[p.id] === i) : [];
              return (
                <button
                  key={`${model.round}-${i}`}
                  type="button"
                  disabled={busy || model.myPick !== null || model.resolved}
                  onClick={() => actions.answer(i)}
                  className={cx("duel-opt", mine && !model.resolved && "is-mine", isAnswer && "is-right", wrongMine && "is-wrong", model.resolved && !isAnswer && !mine && "is-dim")}
                >
                  <span className="duel-key">{LETTERS[i]}</span>
                  <span className="duel-opt-text">{opt}</span>
                  {pickers.length > 0 && (
                    <span className="duel-who">
                      {pickers.map((p) => (
                        <i key={p.id}>{p.me ? "You" : p.name}</i>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {model.myPick !== null && !model.resolved && (
            <p className="duel-wait">
              Locked in. Waiting for {them?.name ?? "the other player"}… ({model.submitted}/{model.players.filter((p) => p.active).length})
            </p>
          )}
          {model.myPick === null && !model.resolved && model.submitted > 0 && <p className="duel-wait">{them?.name ?? "Your friend"} has answered. Your turn!</p>}
          {model.resolved && me && (
            <div ref={verdictRef} className="duel-verdict-wrap">
              <RoundVerdict model={model} me={me} others={others} />
              {model.question.exp && <p className="duel-exp">{model.question.exp}</p>}
              <button type="button" className="duel-btn is-main is-wide" disabled={busy} onClick={actions.next}>
                {model.round + 1 >= model.total ? "See the final score" : "Next question"}
              </button>
            </div>
          )}
        </div>
      )}

      {model.status === "finished" && me && (
        <div className="duel-final">
          {them ? <FinalBanner me={me} them={them} /> : <p className="duel-final-head">Game over</p>}
          {settingsCard}
          <div className="duel-final-actions">
            <button type="button" className="duel-btn is-main" disabled={busy || !ready} onClick={() => actions.setup(model.settings, true)}>
              🔁 Play again
            </button>
            <button type="button" className="duel-btn is-plain" onClick={() => setChanging(true)}>
              Change {IS_KINGS ? "section" : "land"} or difficulty
            </button>
            <button
              type="button"
              className="duel-btn is-plain"
              onClick={() => {
                park("map");
                go("map");
              }}
            >
              Choose another game
            </button>
            <button type="button" className="duel-btn is-plain" onClick={actions.leave}>
              Leave the room
            </button>
          </div>
          {!ready && <p className="duel-note">The other player has left. Invite someone new to play again.</p>}
        </div>
      )}
      {error && <p className="duel-error">{error}</p>}
    </section>
  );
}

function RoundVerdict({ model, me, others }: { model: DuelModel; me: DuelPlayer; others: DuelPlayer[] }) {
  const meRight = model.picks[me.id] === model.answer;
  const them = others[0];
  if (!them) return null;
  const themRight = model.picks[them.id] === model.answer;
  const v = roundVerdict(meRight, themRight);
  const text =
    v === "me" ? "You win this one! 🎉" : v === "them" ? `${them.name} wins this one` : v === "both" ? "You both got it right! 🤝" : "You both missed this one";
  return (
    <div className={cx("duel-verdict", `is-${v}`)}>
      <b>{text}</b>
      <span>
        You {meRight ? "✓" : "✗"} · {them.name} {themRight ? "✓" : "✗"}
        {others.length > 1 && others.slice(1).map((p) => ` · ${p.name} ${model.picks[p.id] === model.answer ? "✓" : "✗"}`)}
      </span>
    </div>
  );
}

function FinalBanner({ me, them }: { me: DuelPlayer; them: DuelPlayer }) {
  const line = finalLine({ name: me.name, score: me.score }, { name: them.name, score: them.score });
  return (
    <div className={cx("duel-final-banner", `is-${line.tone}`)}>
      <span className="duel-final-emoji" aria-hidden>
        {line.tone === "win" ? "🏆" : line.tone === "draw" ? "🤝" : "👏"}
      </span>
      <b>{line.head}</b>
      <span>
        You scored {me.score} · {them.name} scored {them.score}
      </span>
    </div>
  );
}

// ───────────────────────── online ─────────────────────────

function OnlineBattle({ inviteCode, onBack }: { inviteCode: string | null; onBack: () => void }) {
  const name = useQuiz((s) => s.name);
  const age = useQuiz((s) => s.age);
  const difficulty = useQuiz((s) => s.difficulty);
  const challenge = useQuiz((s) => s.challenge);
  const [view, setView] = useState<BattleState | null>(null);
  const [token, setToken] = useState("");
  const [roomId, setRoomId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [myPick, setMyPick] = useState<{ key: string; index: number } | null>(null);
  const started = useRef(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Battle could not continue");
    } finally {
      setBusy(false);
    }
  }, []);

  function remember(nextRoom: string, nextToken: string) {
    setRoomId(nextRoom);
    setToken(nextToken);
    sessionStorage.setItem(SESSION, JSON.stringify({ roomId: nextRoom, playerToken: nextToken }));
  }
  function poke(id: string) {
    void supabase.channel(`battle-${id}`).send({ type: "broadcast", event: "tick", payload: {} });
  }

  const joinRoom = useCallback(
    (roomCode: string) =>
      run(async () => {
        const result = await battleCall("join", { code: roomCode.trim().toUpperCase(), name: name || APP.playerFallback, avatar: APP_ID, player_id: battlePlayerId() });
        if (!result.room_id || !result.player_token || !result.state) throw new Error("That room could not be joined.");
        remember(result.room_id, result.player_token);
        setView(result.state);
        poke(result.room_id);
      }),
    [name, run],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (inviteCode) {
      void joinRoom(inviteCode);
      return;
    }
    const saved = sessionStorage.getItem(SESSION);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { roomId: string; playerToken: string };
      setRoomId(parsed.roomId);
      setToken(parsed.playerToken);
      battleCall("state", { room_id: parsed.roomId, player_token: parsed.playerToken })
        .then((result) => result.state && setView(result.state))
        .catch(() => sessionStorage.removeItem(SESSION));
    } catch {
      sessionStorage.removeItem(SESSION);
    }
  }, [inviteCode, joinRoom]);

  useEffect(() => {
    if (!roomId || !token) return;
    const pull = () => {
      battleCall("state", { room_id: roomId, player_token: token })
        .then((result) => result.state && setView(result.state))
        .catch(() => {});
    };
    const timer = window.setInterval(pull, 1500);
    const channel = supabase.channel(`battle-${roomId}`);
    channel.on("broadcast", { event: "tick" }, pull);
    channel.subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [roomId, token]);

  const leave = () => {
    if (roomId && token) void battleCall("leave", { room_id: roomId, player_token: token }).then(() => poke(roomId));
    sessionStorage.removeItem(SESSION);
    setView(null);
    setToken("");
    setRoomId("");
    onBack();
  };

  if (!view) {
    return (
      <section className="duel">
        <div className="duel-head">
          <div>
            <p className="duel-label">Play online</p>
            <h2 className="duel-title">Make a room</h2>
          </div>
          <button type="button" className="duel-btn is-plain is-small" onClick={onBack}>
            Back
          </button>
        </div>
        <p className="duel-note">Choose what you want to play. Your friend gets the same questions and can change the choice too.</p>
        <SetupPicker
          initial={defaultSettings(age, difficulty, challenge)}
          busy={busy}
          submitLabel="Create the room"
          onSubmit={(settings) =>
            run(async () => {
              const questions = buildBattleQuestions(settings);
              if (questions.length < 3) throw new Error("Not enough questions for that choice. Try another.");
              const result = await battleCall("create", {
                player_id: battlePlayerId(),
                name: name || APP.playerFallback,
                avatar: APP_ID,
                app: APP_ID,
                questions,
                settings: { ...settings, landName: landName(settings.landId) },
              });
              if (!result.room_id || !result.player_token || !result.state) throw new Error("The battle room did not open.");
              remember(result.room_id, result.player_token);
              setView(result.state);
            })
          }
        />
        <form
          className="duel-join"
          onSubmit={(event) => {
            event.preventDefault();
            void joinRoom(code);
          }}
        >
          <p className="duel-label">Or join a friend's room</p>
          <div className="duel-join-row">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} aria-label="Room code" placeholder="CODE" />
            <button type="submit" className="duel-btn is-gold" disabled={busy || code.trim().length < 4}>
              Join
            </button>
          </div>
        </form>
        {error && <p className="duel-error">{error}</p>}
      </section>
    );
  }

  const status: DuelModel["status"] = view.status === "playing" || view.status === "play" ? "playing" : view.status === "finished" || view.status === "done" ? "finished" : "lobby";
  const meId = view.me?.player_id ?? "";
  const pickKey = `${view.game_no ?? 1}-${view.current_round}`;
  const picks: Record<string, number | null> = {};
  for (const r of view.results ?? []) picks[r.player_id] = typeof r.answer_index === "number" ? r.answer_index : null;
  const localPick = myPick?.key === pickKey ? myPick.index : null;
  const model: DuelModel = {
    status,
    round: view.current_round,
    total: view.total_rounds,
    players: view.players.map((p) => ({ id: p.player_id, name: p.display_name, score: p.score, me: p.player_id === meId, active: p.active !== false })),
    question: view.question ? { q: view.question.q, opts: view.question.opts, exp: view.question.exp ?? "" } : null,
    myPick: picks[meId] ?? localPick ?? (view.my_submitted ? -1 : null),
    resolved: !!view.round_resolved,
    answer: typeof view.answer === "number" ? view.answer : null,
    picks,
    submitted: view.submitted_count ?? 0,
    settings: { ...cleanSettings((view.settings ?? {}) as Partial<BattleSettings>), by: view.settings?.by },
  };

  const actions: DuelActions = {
    answer: (index) =>
      run(async () => {
        setMyPick({ key: pickKey, index });
        const result = await battleCall("answer", { room_id: roomId, player_token: token, round: view.current_round, answer_index: index });
        if (result.state) setView(result.state);
        poke(roomId);
      }),
    next: () =>
      run(async () => {
        const result = await battleCall("next", { room_id: roomId, player_token: token, round: view.current_round });
        if (result.state) setView(result.state);
        poke(roomId);
      }),
    start: () =>
      run(async () => {
        const result = await battleCall("start", { room_id: roomId, player_token: token });
        if (result.state) setView(result.state);
        poke(roomId);
      }),
    setup: (settings, startNow) =>
      run(async () => {
        const questions = buildBattleQuestions(settings);
        if (questions.length < 3) throw new Error("Not enough questions for that choice. Try another.");
        const result = await battleCall("setup", {
          room_id: roomId,
          player_token: token,
          questions,
          settings: { ...settings, landName: landName(settings.landId) },
          start: startNow,
        });
        if (result.state) setView(result.state);
        setMyPick(null);
        poke(roomId);
      }),
    leave,
  };

  const inviteLink = () => {
    const url = new URL("/", window.location.origin);
    url.searchParams.set("room", view.code);
    return url.toString();
  };
  const invite =
    model.players.filter((p) => p.active).length < 2 ? (
      <div className="duel-invite">
        <p className="duel-label">Invite a friend</p>
        <p className="duel-code">{view.code}</p>
        <div className="duel-row">
          <button
            type="button"
            className="duel-btn is-plain"
            onClick={() =>
              void navigator.clipboard
                .writeText(view.code)
                .then(() => setShareNote("Room code copied."))
                .catch(() => setShareNote("Select the code above to copy it."))
            }
          >
            Copy code
          </button>
          <button
            type="button"
            className="duel-btn is-gold"
            onClick={async () => {
              const text = `Join my ${APP.name} battle! Room code: ${view.code}`;
              try {
                if (navigator.share) await navigator.share({ title: `Join my ${APP.name} battle`, text, url: inviteLink() });
                else await navigator.clipboard.writeText(inviteLink());
                setShareNote("Invite ready.");
              } catch {
                /* closed */
              }
            }}
          >
            Share invite
          </button>
        </div>
        {shareNote && <p className="duel-note">{shareNote}</p>}
      </div>
    ) : null;

  return <DuelBoard model={model} actions={actions} busy={busy} heading={`Online room ${view.code}`} invite={invite} error={error} />;
}

// ───────────────────────── Bluetooth (Quizy Android app) ─────────────────────────

type Bridge = {
  isAvailable: () => boolean;
  host: () => void;
  connect: (address: string) => void;
  pairedDevices: () => string;
  send: (payload: string) => void;
  state?: () => string;
  requestPermission?: () => void;
  openSettings?: () => void;
  disconnect?: () => void;
};

function nativeBridge(): Bridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { QuizyBluetooth?: Bridge }).QuizyBluetooth ?? null;
}

type BtState = { supported: boolean; permission: boolean; enabled: boolean };
function readBt(b: Bridge): BtState {
  if (b.state) {
    try {
      const s = JSON.parse(b.state()) as Partial<BtState>;
      return { supported: !!s.supported, permission: !!s.permission, enabled: !!s.enabled };
    } catch {
      /* fall through */
    }
  }
  let ok = false;
  try {
    ok = b.isAvailable();
  } catch {
    ok = false;
  }
  return { supported: true, permission: ok, enabled: ok };
}

type BtGame = {
  status: "lobby" | "playing" | "finished";
  settings: BattleSettings & { by?: string };
  questions: BattleQuestion[];
  round: number;
  mine: (number | null)[];
  theirs: (number | null)[];
};

type BtMsg =
  | { t: "hello"; name: string }
  | { t: "setup"; settings: BattleSettings & { by?: string }; questions: BattleQuestion[]; start: boolean }
  | { t: "start" }
  | { t: "answer"; round: number; index: number }
  | { t: "next"; round: number }
  | { t: "leave" };

function BluetoothBattle({ onBack }: { onBack: () => void }) {
  const name = useQuiz((s) => s.name);
  const age = useQuiz((s) => s.age);
  const difficulty = useQuiz((s) => s.difficulty);
  const challenge = useQuiz((s) => s.challenge);
  const bridge = nativeBridge();
  const [bt, setBt] = useState<BtState | null>(bridge ? readBt(bridge) : null);
  const [devices, setDevices] = useState<{ name: string; address: string }[]>([]);
  const [note, setNote] = useState("");
  const [connected, setConnected] = useState(false);
  const [peer, setPeer] = useState("");
  const [game, setGame] = useState<BtGame | null>(null);
  const gameRef = useRef<BtGame | null>(null);
  gameRef.current = game;
  const myName = name || APP.playerFallback;
  const newApp = !!bridge?.state;

  const refresh = useCallback(() => {
    if (!bridge) return;
    setBt(readBt(bridge));
    try {
      setDevices(JSON.parse(bridge.pairedDevices()) as { name: string; address: string }[]);
    } catch {
      setDevices([]);
    }
  }, [bridge]);

  const send = useCallback(
    (msg: BtMsg) => {
      try {
        bridge?.send(JSON.stringify(msg));
      } catch {
        setNote("Could not send to the other phone.");
      }
    },
    [bridge],
  );

  const applySetup = useCallback((settings: BattleSettings & { by?: string }, questions: BattleQuestion[], start: boolean) => {
    setGame({ status: start ? "playing" : "lobby", settings, questions, round: 0, mine: questions.map(() => null), theirs: questions.map(() => null) });
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!bridge) return;
    const w = window as unknown as { QuizyBluetoothEvent?: (raw: string) => void };
    const previous = w.QuizyBluetoothEvent;
    w.QuizyBluetoothEvent = (raw: string) => {
      let ev: { event?: string; data?: { message?: string; device?: string; payload?: string } } = {};
      try {
        ev = JSON.parse(raw);
      } catch {
        return;
      }
      const data = ev.data ?? {};
      if (ev.event === "connected") {
        setConnected(true);
        setPeer(data.device || "the other phone");
        setNote("");
        send({ t: "hello", name: myName });
      } else if (ev.event === "disconnected") {
        setConnected(false);
        setNote("The other phone disconnected.");
      } else if (ev.event === "host_waiting") {
        setNote("Waiting for the other phone to join… On the other phone, open Bluetooth battle and tap this phone's name.");
      } else if (ev.event === "permission" || (ev.event === "status" && data.message === "ready")) {
        refresh();
      } else if (ev.event === "status" || ev.event === "error") {
        setNote(data.message || "");
        refresh();
      } else if (ev.event === "message" && data.payload) {
        let msg: BtMsg;
        try {
          msg = JSON.parse(data.payload) as BtMsg;
        } catch {
          return;
        }
        const g = gameRef.current;
        if (msg.t === "hello") setPeer(msg.name || "Friend");
        else if (msg.t === "setup") applySetup(msg.settings, msg.questions, msg.start);
        else if (msg.t === "start" && g) setGame({ ...g, status: "playing" });
        else if (msg.t === "answer" && g && msg.round === g.round) {
          const theirs = g.theirs.slice();
          theirs[msg.round] = msg.index;
          setGame({ ...g, theirs });
        } else if (msg.t === "next" && g && msg.round === g.round) {
          setGame(g.round + 1 >= g.questions.length ? { ...g, status: "finished" } : { ...g, round: g.round + 1 });
        } else if (msg.t === "leave") {
          setConnected(false);
          setNote(`${peer || "The other player"} left the game.`);
        }
      }
    };
    return () => {
      w.QuizyBluetoothEvent = previous;
    };
  }, [bridge, myName, refresh, send, applySetup, peer]);

  const head = (
    <div className="duel-head">
      <div>
        <p className="duel-label">Bluetooth battle</p>
        <h2 className="duel-title">{connected ? `Connected to ${peer}` : "Connect two phones"}</h2>
      </div>
      <button
        type="button"
        className="duel-btn is-plain is-small"
        onClick={() => {
          if (connected) send({ t: "leave" });
          bridge?.disconnect?.();
          onBack();
        }}
      >
        Back
      </button>
    </div>
  );

  // Not inside the Android app (a browser or the home-screen web app).
  if (!bridge) {
    return (
      <section className="duel">
        {head}
        <div className="duel-help">
          <p>
            Bluetooth needs the <b>Quizy Android app</b>. The Quizy you added to your home screen from the browser is the web version, and browsers are not
            allowed to link two phones by Bluetooth.
          </p>
          <a className="duel-btn is-main is-wide" href={ANDROID_APK_URL}>
            Download the Quizy Android app
          </a>
          <p className="duel-note">After it downloads, open the file and allow your phone to install it. Do this on both phones.</p>
          <p className="duel-note">No Android app? Use “Play online” instead. It works on any phone with internet.</p>
        </div>
      </section>
    );
  }

  // Old version of the Android app: its Bluetooth link cannot deliver messages.
  if (!newApp) {
    return (
      <section className="duel">
        {head}
        <div className="duel-help">
          <p>
            Your Quizy Android app is an older version, and its Bluetooth link has a fault that stops the two phones talking. Please install the new version on
            both phones. Your progress stays.
          </p>
          <a className="duel-btn is-main is-wide" href={ANDROID_APK_URL}>
            Get the new Quizy app
          </a>
          <p className="duel-note">Until then, “Play online” works on both phones.</p>
        </div>
      </section>
    );
  }

  if (bt && (!bt.permission || !bt.enabled)) {
    return (
      <section className="duel">
        {head}
        <div className="duel-help">
          <ol className="duel-steps">
            <li className={bt.permission ? "is-done" : ""}>
              <b>Allow “Nearby devices”</b>
              <span>Quizy needs this permission to find the other phone.</span>
              {!bt.permission && (
                <button type="button" className="duel-btn is-main" onClick={() => bridge.requestPermission?.()}>
                  Allow Bluetooth
                </button>
              )}
            </li>
            <li className={bt.enabled ? "is-done" : ""}>
              <b>Turn Bluetooth on</b>
              {bt.permission && !bt.enabled && (
                <button type="button" className="duel-btn is-main" onClick={() => bridge.requestPermission?.()}>
                  Turn on Bluetooth
                </button>
              )}
            </li>
          </ol>
          <p className="duel-note">
            If nothing pops up: open phone Settings → Apps → Quizy → Permissions → Nearby devices → Allow, then come back here.
          </p>
          {note && <p className="duel-note">{note}</p>}
        </div>
      </section>
    );
  }

  if (!connected) {
    return (
      <section className="duel">
        {head}
        <div className="duel-help">
          <ol className="duel-steps">
            <li>
              <b>Pair the two phones once</b>
              <span>In your phone's Bluetooth settings, pair with the other phone (both phones must have Bluetooth on).</span>
              <button type="button" className="duel-btn is-plain" onClick={() => bridge.openSettings?.()}>
                Open Bluetooth settings
              </button>
            </li>
            <li>
              <b>One phone hosts</b>
              <button type="button" className="duel-btn is-main" onClick={() => bridge.host()}>
                Host on this phone
              </button>
            </li>
            <li>
              <b>The other phone joins</b>
              <span>Tap the host phone's name:</span>
              <div className="duel-devices">
                {devices.length === 0 && <span className="duel-note">No paired phones yet. Pair them first (step 1).</span>}
                {devices.map((d) => (
                  <button key={d.address} type="button" className="duel-btn is-gold" onClick={() => bridge.connect(d.address)}>
                    Join {d.name}
                  </button>
                ))}
              </div>
            </li>
          </ol>
          {note && <p className="duel-note is-live">{note}</p>}
        </div>
      </section>
    );
  }

  // Connected: choose a game or play it.
  if (!game) {
    return (
      <section className="duel">
        {head}
        <p className="duel-note">Choose what to play. {peer} gets the same questions (either of you can choose).</p>
        <SetupPicker
          initial={defaultSettings(age, difficulty, challenge)}
          submitLabel="Start the battle"
          onSubmit={(settings) => {
            const questions = buildBattleQuestions(settings);
            const full = { ...settings, by: myName };
            send({ t: "setup", settings: full, questions, start: true });
            applySetup(full, questions, true);
          }}
        />
      </section>
    );
  }

  const meId = "me";
  const themId = "them";
  const score = (arr: (number | null)[]) => arr.reduce<number>((n, pick, i) => n + (pick !== null && pick === game.questions[i]?.a ? 1 : 0), 0);
  const q = game.questions[game.round];
  const resolved = game.status === "playing" && game.mine[game.round] != null && game.theirs[game.round] != null;
  const model: DuelModel = {
    status: game.status,
    round: game.round,
    total: game.questions.length,
    players: [
      { id: meId, name: myName, score: score(game.mine), me: true, active: true },
      { id: themId, name: peer || "Friend", score: score(game.theirs), me: false, active: connected },
    ],
    question: q ? { q: q.q, opts: q.opts, exp: q.exp } : null,
    myPick: game.mine[game.round] ?? null,
    resolved,
    answer: resolved && q ? q.a : null,
    picks: resolved ? { [meId]: game.mine[game.round], [themId]: game.theirs[game.round] } : {},
    submitted: (game.mine[game.round] != null ? 1 : 0) + (game.theirs[game.round] != null ? 1 : 0),
    settings: game.settings,
  };
  const actions: DuelActions = {
    answer: (index) => {
      const mine = game.mine.slice();
      mine[game.round] = index;
      setGame({ ...game, mine });
      send({ t: "answer", round: game.round, index });
    },
    next: () => {
      send({ t: "next", round: game.round });
      setGame(game.round + 1 >= game.questions.length ? { ...game, status: "finished" } : { ...game, round: game.round + 1 });
    },
    start: () => {
      send({ t: "start" });
      setGame({ ...game, status: "playing" });
    },
    setup: (settings, startNow) => {
      const questions = buildBattleQuestions(settings);
      const full = { ...settings, by: myName };
      send({ t: "setup", settings: full, questions, start: startNow });
      applySetup(full, questions, startNow);
    },
    leave: () => {
      send({ t: "leave" });
      bridge.disconnect?.();
      setConnected(false);
      setGame(null);
      onBack();
    },
  };
  return <DuelBoard model={model} actions={actions} busy={false} heading={`Bluetooth · ${peer}`} error={note} />;
}
