// « Préparer un échange » (ticket § 5): PO compares what the Cadrage needs
// with what is known and prepares only the relevant topics — one per
// dimension still open, its questions listed for « Préparer en détail ».
// Written by code, no model (the same idea as the Master's exchange agenda).
// Client-safe.

import type { FramingAssessment, QuestionState } from "@/lib/framing/assess";
import type { Dimension } from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingIntel };

export type FramingTopic = {
  dimension: Dimension;
  topic: string;
  minutes: number;
  questions: string[];
};

/** The question as it is asked in the call: to confirm, or to answer. */
export function callQuestion(q: QuestionState): string {
  const t = fr.framingIntel.questions[q.key];
  if (q.status === "to_confirm" && q.display)
    return `${t.label} : ${q.display} ?`;
  return t.ask;
}

const MINUTES_PER_QUESTION = 4;

export function framingCallTopics(
  assessment: FramingAssessment,
): FramingTopic[] {
  return assessment.dimensions.flatMap((d) => {
    const open = d.questions.filter((q) => q.status !== "known");
    if (open.length === 0) return [];
    return [
      {
        dimension: d.dimension,
        topic: fr.framingIntel.dimensions[d.dimension],
        minutes: Math.min(15, Math.max(5, open.length * MINUTES_PER_QUESTION)),
        questions: open.map(callQuestion),
      },
    ];
  });
}

/** The call's purpose, proposed from the topics (the person rewrites it). */
export function framingCallPurpose(topics: FramingTopic[]): string {
  const t = fr.framingIntel.call;
  return topics.length
    ? t.purpose(topics.map((topic) => topic.topic.toLowerCase()))
    : t.purposeConfirm;
}
