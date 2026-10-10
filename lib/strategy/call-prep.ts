// « Préparer un échange » for the Strategy (ticket § 1): a topic for each
// dimension not completed yet, its questions listed for « Préparer en
// détail ». Written by code, no model. Client-safe.

import { fr } from "@/lib/i18n/fr";
import type { StrategyAssessment } from "@/lib/strategy/assess";
import type { StrategyDimension } from "@/lib/strategy/dimensions";

export type StrategyTopic = {
  dimension: StrategyDimension;
  topic: string;
  minutes: number;
  questions: string[];
};

const MINUTES_PER_QUESTION = 4;

export function strategyCallTopics(
  assessment: StrategyAssessment,
): StrategyTopic[] {
  const t = fr.strategyFlow;
  return assessment.dimensions.flatMap((d) => {
    if (d.state === "done") return [];
    const questions = [
      ...t.call.questions[d.dimension],
      ...d.toDecide.map((label) => `${t.states.to_decide} : ${label}`),
    ];
    return [
      {
        dimension: d.dimension,
        topic: t.dimensions[d.dimension],
        minutes: Math.min(
          15,
          Math.max(5, questions.length * MINUTES_PER_QUESTION),
        ),
        questions,
      },
    ];
  });
}

export function strategyCallPurpose(topics: StrategyTopic[]): string {
  const t = fr.strategyFlow.call;
  return topics.length
    ? t.purpose(topics.map((topic) => topic.topic.toLowerCase()))
    : t.purposeConfirm;
}
