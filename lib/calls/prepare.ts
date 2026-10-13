// « Préparer un échange » (Cadrage, Stratégie, Conception, Production): the
// agenda's arithmetic, shared by the panels and the actions that rebuild
// the agenda. Client-safe.

export type AgendaTopic = {
  id: string;
  topic: string;
  minutes: number;
  questions: string[];
};

// A topic the person adds, with the time they give it.
export type ExtraTopic = { topic: string; minutes: number };

// The time the person gives a topic PO prepared, by its id, when they
// changed PO's estimate.
export type TopicDurations = Record<string, number>;

// A topic the person adds takes this long until they say otherwise.
export const EXTRA_TOPIC_MINUTES = 5;
// The bounds of a topic's time, in minutes.
export const TOPIC_MINUTES_MIN = 1;
export const TOPIC_MINUTES_MAX = 120;

const durationOf = (topic: AgendaTopic, durations: TopicDurations) =>
  durations[topic.id] ?? topic.minutes;

/** The agenda as it will be created: kept topics, then the person's own. */
export function agendaRecap(
  topics: AgendaTopic[],
  kept: Set<string>,
  extra: ExtraTopic[],
  durations: TopicDurations,
): ExtraTopic[] {
  return [
    ...topics
      .filter((x) => kept.has(x.id))
      .map((x) => ({ topic: x.topic, minutes: durationOf(x, durations) })),
    ...extra,
  ];
}

/** Approximate length of the exchange: kept topics plus the person's own. */
export function agendaMinutes(
  topics: AgendaTopic[],
  kept: Set<string>,
  extra: ExtraTopic[],
  durations: TopicDurations,
): number {
  return agendaRecap(topics, kept, extra, durations).reduce(
    (s, x) => s + x.minutes,
    0,
  );
}

/**
 * The agenda stored with the call, rebuilt on the server from the topics
 * PO prepared (never sent by the browser): the kept ones with the time the
 * person gave them, their questions when « Préparer en détail », then the
 * person's own topics.
 */
export function buildAgenda(
  prepared: Array<{
    key: string;
    topic: string;
    minutes: number;
    questions: string[];
  }>,
  choice: {
    topics: string[];
    detailed: boolean;
    extraTopics: ExtraTopic[];
    topicMinutes: TopicDurations;
  },
) {
  const kept = new Set(choice.topics);
  return [
    ...prepared
      .filter((topic) => kept.has(topic.key))
      .map(({ key, topic, minutes, questions }) => ({
        topic,
        minutes: choice.topicMinutes[key] ?? minutes,
        ...(choice.detailed && questions.length ? { questions } : {}),
      })),
    ...choice.extraTopics,
  ];
}

// A prepared topic takes about this long per question, between 5 and 15 min.
const MINUTES_PER_QUESTION = 4;

/** Approximate length of a prepared topic, from its number of questions. */
export function topicMinutes(questions: number): number {
  return Math.min(15, Math.max(5, questions * MINUTES_PER_QUESTION));
}
