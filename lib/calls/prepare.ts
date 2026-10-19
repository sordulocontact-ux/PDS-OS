// The agenda's arithmetic of a prepared call, shared by the common form
// (components/calls/prep/) and the modules that compute PO's points.
// Client-safe.

// A point the person adds takes this long until they say otherwise.
export const EXTRA_TOPIC_MINUTES = 5;
// The bounds of a point's time, in minutes.
export const TOPIC_MINUTES_MIN = 1;
export const TOPIC_MINUTES_MAX = 120;

// A prepared point takes about this long per question, between 5 and 15 min.
const MINUTES_PER_QUESTION = 4;

/** Approximate length of a prepared point, from its number of questions. */
export function topicMinutes(questions: number): number {
  return Math.min(15, Math.max(5, questions * MINUTES_PER_QUESTION));
}
