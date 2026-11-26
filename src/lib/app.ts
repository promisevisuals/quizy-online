/**
 * One codebase, two apps. The build setting VITE_APP_ID picks which one:
 * "quizy" (default) or "kings" (King's Bible Quest). Each Vercel project sets it.
 */
import bibleBlurbs from "@/data/bible-blurbs.json";

export type AppId = "quizy" | "kings";

function readId(): AppId {
  let raw: unknown;
  try {
    raw = (import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_APP_ID;
  } catch {
    raw = undefined;
  }
  return raw === "kings" ? "kings" : "quizy";
}

export const APP_ID: AppId = readId();
export const IS_KINGS = APP_ID === "kings";

type AppConfig = {
  id: AppId;
  name: string;
  tagline: string;
  mark: string;
  icon180: string;
  icon192: string;
  themeColor: string;
  gateLine: string;
  gateNote: string;
  playerLabel: string;
  playerFallback: string;
  trailTitle: string;
  landWord: string;
  landsWord: string;
  banner: string;
  ages: { young: string; old: string; youngNote: string; oldNote: string };
  blurbs: Record<string, string>;
  /** Spelling, labelling and memory games use school content, so the Bible app hides them. */
  learningGames: boolean;
  academy: boolean;
  jungle: boolean;
  shareText: string;
  siteUrl: string;
  shareMessages: string[];
};

const QUIZY_BLURBS: Record<string, string> = {
  animal: "Lions, bees, whales and how they survive.",
  space: "Planets, stars, rockets and the Moon.",
  ocean: "Reefs, tides and creatures of the deep.",
  number: "Sums, shapes, patterns and puzzles.",
  world: "Countries, capitals, rivers and maps.",
  news: "What is happening in 2026.",
  science: "Forces, light, sound and materials.",
  body: "Your heart, bones, brain and senses.",
  logic: "Riddles and brain teasers.",
  africa: "Stories, kingdoms and cultures.",
  tech: "Computers, coding and inventions.",
  sports: "Football, athletics, tennis and more.",
  spelling: "Hear the word, then spell it.",
};

const CONFIGS: Record<AppId, AppConfig> = {
  quizy: {
    id: "quizy",
    name: "Quizy",
    tagline: "One question at a time",
    mark: "/quizy-mark.png",
    icon180: "/icons/quizy-180.png",
    icon192: "/icons/quizy-192.png",
    themeColor: "#1c7a4a",
    gateLine: "The trail is open",
    gateNote: "Setting out… tap to enter",
    playerLabel: "Explorer name",
    playerFallback: "Explorer",
    trailTitle: "The trail",
    landWord: "land",
    landsWord: "lands",
    banner: "/art/table.jpg",
    ages: { young: "Ages 5–7", old: "Ages 8–10", youngNote: "Shorter words and warmer questions.", oldNote: "A fuller trail for older explorers." },
    blurbs: QUIZY_BLURBS,
    learningGames: true,
    academy: true,
    jungle: true,
    shareText: "Quizy – a free learning adventure for kids",
    siteUrl: "https://quizy.promisevisuals.com",
    shareMessages: [],
  },
  kings: {
    id: "kings",
    name: "King's Bible Quest",
    tagline: "Learn the Word, one question at a time",
    mark: "/kings-mark.png",
    icon180: "/icons/kings-180.png",
    icon192: "/icons/kings-192.png",
    themeColor: "#4a1c8a",
    gateLine: "Thy word is a lamp",
    gateNote: "Opening the Book… tap to enter",
    playerLabel: "Your name",
    playerFallback: "Friend",
    trailTitle: "The quest",
    landWord: "section",
    landsWord: "sections",
    banner: "/art/kings/banner.svg",
    ages: { young: "Kids", old: "Grown-ups", youngNote: "Bible stories for children.", oldNote: "Deeper questions for teens and adults." },
    blurbs: bibleBlurbs as Record<string, string>,
    learningGames: false,
    academy: false,
    jungle: false,
    shareText: "King's Bible Quest – free Bible trivia for kids and grown-ups",
    siteUrl: "https://kings.promisevisuals.com",
    shareMessages: [
      "👑📖 Come play King's Bible Quest with me! Free Bible trivia for kids and grown-ups: 16 sections from Creation to Revelation, memory verses, “Who said it?” and more. No ads. 🙌",
      "✨ How well do you know your Bible? King's Bible Quest has Old and New Testament questions with the verse after every answer. Kids and grown-ups each get their own questions. Come and beat my score! 🏆",
      "🙏 Screen time that builds faith! King's Bible Quest is a free Bible quiz for the whole family: Noah, Moses, David, Jesus' miracles, Paul's journeys and more. 💛",
    ],
  },
};

export const APP: AppConfig = CONFIGS[APP_ID];

export function landArtFor(id: string) {
  if (IS_KINGS) return `/art/kings/${id}.svg`;
  return id === "body" ? "/art/lands/body.svg" : `/art/lands/${id}.jpg`;
}
