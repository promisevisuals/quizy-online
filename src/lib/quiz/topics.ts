/**
 * Topic menus for lands. A land listed here asks the player what to play before a round:
 * a topic first, and for some topics extra choices (like the year and the team for football).
 * Questions carry `topic` (plus `also` for extra topics) and `tags` such as "era:2010s" or "team:arsenal".
 */

export type TopicChoice = { id: string; label: string; emoji?: string };
export type TopicFilter = { key: string; label: string; options: TopicChoice[] };
export type Topic = TopicChoice & { filters?: TopicFilter[] };

export const LAND_TOPICS: Record<string, Topic[]> = {
  sports: [
    {
      id: "football",
      label: "Football",
      emoji: "⚽",
      filters: [
        {
          key: "era",
          label: "When",
          options: [
            { id: "rules", label: "How the game works" },
            { id: "classic", label: "Before 2000" },
            { id: "2000s", label: "2000s" },
            { id: "2010s", label: "2010s" },
            { id: "2020s", label: "2020s" },
          ],
        },
        {
          key: "team",
          label: "Team",
          options: [
            { id: "nigeria", label: "Nigeria", emoji: "🇳🇬" },
            { id: "brazil", label: "Brazil", emoji: "🇧🇷" },
            { id: "argentina", label: "Argentina", emoji: "🇦🇷" },
            { id: "england", label: "England", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
            { id: "manutd", label: "Man United" },
            { id: "arsenal", label: "Arsenal" },
            { id: "chelsea", label: "Chelsea" },
            { id: "liverpool", label: "Liverpool" },
            { id: "realmadrid", label: "Real Madrid" },
            { id: "barcelona", label: "Barcelona" },
          ],
        },
      ],
    },
    { id: "basketball", label: "Basketball", emoji: "🏀" },
    { id: "athletics", label: "Running & athletics", emoji: "🏃" },
    { id: "tennis", label: "Tennis", emoji: "🎾" },
    { id: "olympics", label: "The Olympics", emoji: "🏅" },
    { id: "more", label: "Other sports & fitness", emoji: "🏏" },
  ],
};

/** What the player picked: a topic, and one option per extra choice (missing = any). */
export type LandPick = { topic: string; choices: Record<string, string> };

type Tagged = { topic?: string; also?: string[]; tags?: string[] };

export function matchesPick(question: Tagged, pick: LandPick | null | undefined) {
  if (!pick || !pick.topic) return true;
  if (question.topic !== pick.topic && !(question.also ?? []).includes(pick.topic)) return false;
  for (const [key, value] of Object.entries(pick.choices)) {
    if (value && !(question.tags ?? []).includes(`${key}:${value}`)) return false;
  }
  return true;
}

export function topicsFor(landId: string) {
  return LAND_TOPICS[landId] ?? [];
}

/** A short title for the round, e.g. "Football · 2010s · Chelsea". */
export function pickTitle(landId: string, pick: LandPick | null | undefined) {
  if (!pick?.topic) return "";
  const topic = topicsFor(landId).find((t) => t.id === pick.topic);
  if (!topic) return "";
  const parts = [topic.label];
  for (const filter of topic.filters ?? []) {
    const chosen = filter.options.find((o) => o.id === pick.choices[filter.key]);
    if (chosen) parts.push(chosen.label);
  }
  return parts.join(" · ");
}
