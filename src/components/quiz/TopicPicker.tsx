import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";
import { countForPick } from "@/lib/quiz/logic";
import { topicsFor, type LandPick } from "@/lib/quiz/topics";

/**
 * "What do you want to play?" Pick a topic (or a mix of everything); some topics offer
 * extra choices such as the year and the team for football. Choices with no questions are greyed out.
 */
export function TopicPicker({ landId, landName, onStart, onClose }: { landId: string; landName: string; onStart: (pick: LandPick | null) => void; onClose: () => void }) {
  const topics = topicsFor(landId);
  const [topic, setTopic] = useState<string>("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const current = topics.find((t) => t.id === topic);
  const pick: LandPick | null = topic ? { topic, choices } : null;
  const count = useMemo(() => countForPick(landId, pick), [landId, topic, choices]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id: string) => {
    setTopic(id);
    setChoices({});
  };
  const setChoice = (key: string, value: string) => setChoices((c) => ({ ...c, [key]: c[key] === value ? "" : value }));

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="topic-backdrop" role="dialog" aria-modal="true" aria-label={`Choose what to play in ${landName}`} onClick={onClose}>
      <div className="topic-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-2xl font-semibold leading-tight">What do you want to play?</h3>
          <button type="button" onClick={onClose} className="inline-flex size-10 items-center justify-center rounded-xl border border-line" aria-label="Close">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <p className="text-sm text-muted">{landName}</p>

        <div className="topic-grid mt-3">
          <button type="button" onClick={() => choose("")} className={topic === "" ? "is-active" : ""} aria-pressed={topic === ""}>
            <span aria-hidden>🎲</span> Mix of everything
          </button>
          {topics.map((t) => (
            <button key={t.id} type="button" onClick={() => choose(t.id)} className={topic === t.id ? "is-active" : ""} aria-pressed={topic === t.id}>
              <span aria-hidden>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>

        {current?.filters?.map((filter) => (
          <div key={filter.key} className="mt-3">
            <p className="text-xs font-extrabold uppercase tracking-widest text-gold">
              {filter.label} <span className="font-bold normal-case tracking-normal text-muted">(optional)</span>
            </p>
            <div className="topic-chips mt-1">
              <button type="button" onClick={() => setChoices((c) => ({ ...c, [filter.key]: "" }))} className={!choices[filter.key] ? "is-active" : ""}>
                Any
              </button>
              {filter.options.map((option) => {
                const n = countForPick(landId, { topic, choices: { ...choices, [filter.key]: option.id } });
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setChoice(filter.key, option.id)}
                    disabled={n === 0}
                    className={choices[filter.key] === option.id ? "is-active" : ""}
                    aria-pressed={choices[filter.key] === option.id}
                    title={n === 0 ? "No questions for this combination yet" : `${n} questions`}
                  >
                    {option.emoji ? <span aria-hidden>{option.emoji} </span> : null}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onStart(pick)}
          disabled={count === 0}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-lg font-extrabold text-primary-fg disabled:opacity-50"
        >
          <Play className="size-5" aria-hidden /> Start {count < 10 && pick ? `(${count} questions)` : ""}
        </button>
      </div>
    </div>,
    document.body,
  );
}
