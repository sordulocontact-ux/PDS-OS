// « Préparer un échange » (Cadrage, Stratégie): the agenda's arithmetic,
// shared by the panels and the actions that rebuild the agenda. Client-safe.

export type AgendaTopic = {
  id: string;
  topic: string;
  minutes: number;
  questions: string[];
};

// A topic the person adds takes this long.
export const EXTRA_TOPIC_MINUTES = 5;

/** Approximate length of the exchange: kept topics plus the person's own. */
export function agendaMinutes(
  topics: AgendaTopic[],
  kept: Set<string>,
  extra: string[],
): number {
  return (
    topics.filter((x) => kept.has(x.id)).reduce((s, x) => s + x.minutes, 0) +
    extra.length * EXTRA_TOPIC_MINUTES
  );
}
