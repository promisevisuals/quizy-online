import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Heart, MessageCircle, Send, Share2, ThumbsUp, X } from "lucide-react";

export const QUIZY_URL = "https://quizy.promisevisuals.com";
/** Shared links carry ?ref=share so the Command Center can count visitors who came from a share. */
const SHARE_URL = `${QUIZY_URL}/?ref=share`;

/** A few warm invitations; one is picked each time so repeat shares don't feel copy-pasted. */
const MESSAGES = [
  "🌴 Come explore Quizy with me! A free jungle quiz adventure for kids aged 5–10: 13 lands to conquer (animals, space, the human body and more), stars and badges to collect, and a brand-new weekly challenge to brag about. 🏆🦜",
  "🐍 Can you spell from memory? Quizy's new Word Snake shows you a word, hides it, and you steer the snake to eat the letters in order! Plus Memory Match, 13 quiz lands and a weekly challenge. Free and so much fun! ✨",
  "✨ Little explorers, the jungle is calling! Quizy turns learning into an adventure: answer questions, unlock lands, play Word Snake and Memory Match, then share your weekly score card. Easy to Expert, there's a level for everyone! 🐒🌿",
  "🧠 Screen time that actually teaches! Quizy is a free quiz game for kids with 13 colourful lands, brain games that get harder as you grow, and a weekly challenge the whole family can play. Come and beat my score! 🌟",
];

function pickMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

export function shareText(message: string) {
  return `${message}\n\n👉 ${SHARE_URL}`;
}

type Variant = "icon" | "card";

/**
 * "Share Quizy" — opens the phone's share sheet with a warm message and the link.
 * Where the share sheet isn't available (most laptops), it shows WhatsApp, Facebook,
 * X and Copy buttons instead.
 */
export function ShareQuizyButton({ variant = "icon", title, note }: { variant?: Variant; title?: string; note?: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(MESSAGES[0]);
  const [status, setStatus] = useState("");

  async function share() {
    const next = pickMessage();
    setMessage(next);
    setStatus("");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Quizy — the jungle quiz adventure", text: next, url: SHARE_URL });
        setStatus("Thank you for sharing Quizy! 💛");
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    setOpen(true);
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-line"
          aria-label="Share Quizy with friends"
          title="Share Quizy"
        >
          <Share2 className="size-5" />
        </button>
      ) : (
        <div className="mt-6 rounded-card border-2 border-gold bg-surface-2 p-4 text-left">
          <p className="inline-flex items-center gap-2 font-display text-xl font-semibold">
            <Heart className="size-5 text-gold" aria-hidden />
            {title ?? "Share the adventure"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {note ?? "Know a little explorer who'd love Quizy? Send it to friends and family — it's free to play."}
          </p>
          <button
            type="button"
            onClick={() => void share()}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold px-4 font-extrabold text-gold-fg"
          >
            <Share2 className="size-5" aria-hidden />
            Share Quizy
          </button>
          {status && (
            <p aria-live="polite" className="mt-2 text-sm font-bold text-muted">
              {status}
            </p>
          )}
        </div>
      )}
      {/* Portal so the sheet always covers the screen, even when opened from the top bar. */}
      {open && createPortal(<ShareSheet message={message} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function ShareSheet({ message, onClose }: { message: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const full = shareText(message);
  const encoded = encodeURIComponent(full);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const links = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encoded}` },
    { label: "Facebook", icon: ThumbsUp, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(message)}` },
    { label: "X", icon: Send, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(SHARE_URL)}` },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/90 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share Quizy"
        className="screen-in w-full max-w-md rounded-card border border-gold bg-surface p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="logo-plate">
              <img src="/quizy-mark.png" alt="" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold leading-none">Share Quizy</h2>
              <p className="mt-1 text-sm text-muted">Your message is ready to send.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-2xl border border-line" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-4 whitespace-pre-line rounded-2xl border border-line bg-surface-2 p-3 text-sm leading-relaxed">{full}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {links.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface text-sm font-extrabold"
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-extrabold text-primary-fg"
        >
          {copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
          {copied ? "Copied! Paste it anywhere" : "Copy message and link"}
        </button>
      </div>
    </div>
  );
}
