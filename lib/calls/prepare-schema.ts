// What the common call form sends about the agenda, checked the same way by
// every kind of prepared call (lib/calls/prep/actions.ts).

import { z } from "zod";

import {
  EXTRA_TOPIC_MINUTES,
  TOPIC_MINUTES_MAX,
  TOPIC_MINUTES_MIN,
} from "@/lib/calls/prepare";

const minutes = z.number().int().min(TOPIC_MINUTES_MIN).max(TOPIC_MINUTES_MAX);

/**
 * The agenda as the person ordered and worded it: PO's points keep their
 * `key`, the person's own have none. Durations are optional: absent, PO's
 * estimate stays.
 */
export const agendaSchema = z
  .array(
    z.object({
      key: z.string().min(1).max(64).nullable(),
      topic: z.string().trim().min(1).max(200),
      minutes: minutes.nullable(),
    }),
  )
  .max(20);

export type SentAgenda = z.infer<typeof agendaSchema>;

/** A point PO prepared, as the module's code computes it on the server. */
export type PreparedPoint = {
  key: string;
  topic: string;
  minutes: number;
  questions: string[];
  // What the module stores with the point (the Cadrage's dimension).
  extra?: Record<string, string>;
};

export type StoredPoint = {
  key?: string;
  topic: string;
  minutes: number;
  questions?: string[];
  // What the module stores with the point (the Cadrage's dimension).
  [extra: string]: string | number | string[] | undefined;
};

/**
 * The agenda stored with the call, in the person's order and words. A point
 * of PO is matched by its key against what the server prepared (never
 * trusted from the browser): it keeps its questions, read in the planned
 * exchange's card, and its estimate unless the person gave a duration. An unknown
 * key is a point of the person.
 */
export function buildPreparedAgenda(
  prepared: PreparedPoint[],
  sent: SentAgenda,
): StoredPoint[] {
  const byKey = new Map(prepared.map((p) => [p.key, p]));
  const seen = new Set<string>();
  return sent.map((item): StoredPoint => {
    const point = item.key ? byKey.get(item.key) : undefined;
    if (point && !seen.has(point.key)) {
      seen.add(point.key);
      return {
        ...point.extra,
        key: point.key,
        topic: item.topic,
        minutes: item.minutes ?? point.minutes,
        ...(point.questions.length ? { questions: point.questions } : {}),
      };
    }
    return { topic: item.topic, minutes: item.minutes ?? EXTRA_TOPIC_MINUTES };
  });
}
