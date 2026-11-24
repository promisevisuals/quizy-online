import { useState } from "react";
import { MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { sendQuizyFeedback } from "@/lib/quiz/cloud";
import { WHATSAPP_LINK } from "@/lib/quiz/contact";
import { ShareQuizyButton } from "@/components/quiz/ShareQuizy";

/**
 * One-tap "did your child enjoy this?" after a land or game. A thumbs up leads to
 * sharing Quizy; a thumbs down asks what went wrong. Anyone can answer, no sign-in.
 */
export function QuickFeedback({ context }: { context: string }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const rate = (value: 1 | -1) => {
    setRating(value);
    setError("");
    sendQuizyFeedback({ kind: "rating", rating: value, context }).catch(() => undefined);
  };

  const sendComment = () => {
    if (!comment.trim() || !rating) return;
    sendQuizyFeedback({ kind: rating === 1 ? "idea" : "problem", comment, context })
      .then(() => setSent(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not send"));
  };

  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4 text-left">
      {rating === null ? (
        <>
          <p className="text-center font-extrabold">Did you enjoy this?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => rate(1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-extrabold">
              <ThumbsUp className="size-5 text-good" aria-hidden /> Yes!
            </button>
            <button type="button" onClick={() => rate(-1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-extrabold">
              <ThumbsDown className="size-5 text-bad" aria-hidden /> Not really
            </button>
          </div>
        </>
      ) : sent ? (
        <p className="text-center font-extrabold">Thank you! We read every message.</p>
      ) : (
        <>
          <p className="font-extrabold">{rating === 1 ? "Yay! What did you like most?" : "Sorry! What went wrong or was boring?"}</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder={rating === 1 ? "Optional: tell us in a few words" : "Tell us in a few words"}
            className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-fg"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={sendComment} disabled={!comment.trim()} className="min-h-10 rounded-xl bg-primary px-4 font-extrabold text-primary-fg disabled:opacity-50">
              Send
            </button>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-extrabold">
              <MessageCircle className="size-4 text-good" aria-hidden /> Parents: chat with us on WhatsApp
            </a>
          </div>
          {error ? <p className="mt-1 text-sm text-bad">{error}</p> : null}
        </>
      )}
      {rating === 1 ? (
        <ShareQuizyButton variant="card" title="Know another parent?" note="Share Quizy with them. It's free, and children learn while they play!" />
      ) : null}
    </div>
  );
}
