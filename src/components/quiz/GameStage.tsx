import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Full-screen frame for the side games: a slim bar on top (back, title, stats)
 * and the game filling the rest of the screen, on phones and laptops alike.
 */
export function GameStage({
  title,
  heading,
  onBack,
  stats,
  full = false,
  children,
}: {
  title: string;
  /** Replaces the title text in the bar (Word Snake shows the word to spell there). */
  heading?: ReactNode;
  onBack: () => void;
  stats?: ReactNode;
  /** Let the game use the whole width of the screen, edge to edge. */
  full?: boolean;
  children: ReactNode;
}) {
  // Portalled to <body>: the app's screen wrapper animates with a transform,
  // which would otherwise trap this fixed layer inside it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;
  return createPortal(
    <section className="game-stage text-fg" aria-label={title}>
      <div className={full ? "game-stage-bar is-full" : "game-stage-bar"}>
        <button type="button" onClick={onBack} className="game-back" aria-label="Back to the trail">
          <ArrowLeft className="size-4" aria-hidden />
          <span className={heading ? "hidden sm:inline" : ""}>Trail</span>
        </button>
        {heading ?? <h2 className="truncate font-display text-lg font-semibold sm:text-xl">{title}</h2>}
        <div className="ml-auto flex min-w-0 items-center gap-2 text-right text-xs font-extrabold text-muted sm:text-sm">{stats}</div>
      </div>
      <div className={full ? "game-stage-body is-full" : "game-stage-body"}>{children}</div>
    </section>,
    document.body,
  );
}
