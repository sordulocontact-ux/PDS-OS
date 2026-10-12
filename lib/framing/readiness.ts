// « Cadrage complet » is not « prêt » (PROJ-UX-06): the Cadrage is complete
// when every question has its answer; the operational prerequisites it lists
// (PROJ-UX-05, items with their state) are satisfied only once done or
// existing. Both are said apart, decided by code. Client-safe.

import type { FramingAssessment } from "@/lib/framing/assess";
import type { ItemState } from "@/lib/framing/dimensions";

const SATISFIED: readonly ItemState[] = ["done", "exists"];

export type FramingReadiness = {
  complete: boolean;
  prerequisites: { total: number; satisfied: number; open: string[] };
};

export function framingReadiness(a: FramingAssessment): FramingReadiness {
  const question = a.dimensions
    .flatMap((d) => d.questions)
    .find((q) => q.key === "prerequisites");
  const items =
    question?.status === "known" && question.answer?.kind === "text"
      ? (question.answer.items ?? [])
      : [];
  const open = items.filter((i) => !SATISFIED.includes(i.state));
  return {
    complete: a.ready && a.optionalEmpty.length === 0,
    prerequisites: {
      total: items.length,
      satisfied: items.length - open.length,
      open: open.map((i) => i.label),
    },
  };
}
