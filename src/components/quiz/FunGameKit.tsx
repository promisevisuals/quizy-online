import { Ticket } from "lucide-react";
import { ARCADE_LEVELS, LEVEL_NAMES, type ArcadeLevel } from "@/lib/quiz/arcade";
import { useQuiz } from "@/lib/quiz/store";
import { passMark } from "@/lib/quiz/unlocks";

/** Spends a game ticket when a fun game starts. Owners play free. */
export function useTicket() {
  const tickets = useQuiz((s) => s.tickets);
  const owner = useQuiz((s) => s.role === "owner");
  const spendTicket = useQuiz((s) => s.spendTicket);
  return { tickets, owner, canStart: owner || tickets > 0, spend: spendTicket };
}

export function TicketCount() {
  const { tickets, owner } = useTicket();
  return (
    <span className="ticket-chip" aria-label={owner ? "Owner: free play" : `${tickets} game tickets`}>
      <Ticket className="size-4" aria-hidden />
      {owner ? "Free" : tickets}
    </span>
  );
}

/** Shown in a game when the explorer has used up their tickets. */
export function NoTickets() {
  const park = useQuiz((s) => s.park);
  return (
    <div className="mt-2">
      <p className="font-display text-xl font-semibold">Out of game tickets</p>
      <p className="mt-1 text-sm text-muted">
        Play a land and score {passMark(10)} or more out of 10 to earn 3 more tickets. A perfect score earns 4.
      </p>
      <button type="button" onClick={() => park("map")} className="mt-3 min-h-12 rounded-2xl bg-primary px-6 font-extrabold text-primary-fg">
        Go to the lands
      </button>
    </div>
  );
}

export function LevelChoice({ level, onChange, blurb }: { level: ArcadeLevel; onChange: (l: ArcadeLevel) => void; blurb?: string }) {
  return (
    <div className="w-full">
      <div className="arcade-levels" role="radiogroup" aria-label="Difficulty">
        {ARCADE_LEVELS.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={item === level}
            onClick={() => onChange(item)}
            className={item === level ? "is-active" : ""}
          >
            {LEVEL_NAMES[item]}
          </button>
        ))}
      </div>
      {blurb ? <p className="mt-1 text-xs font-bold text-muted">{blurb}</p> : null}
    </div>
  );
}

/** "Uses 1 ticket" line under a start button. */
export function TicketHint() {
  const { tickets, owner } = useTicket();
  if (owner) return <p className="mt-1 text-xs font-bold text-muted">Owner: free play</p>;
  return (
    <p className="mt-1 text-xs font-bold text-muted">
      Uses 1 game ticket · you have {tickets}
    </p>
  );
}
