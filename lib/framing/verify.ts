// What PO proposed that a person checks in the list of « Les 6 dimensions »
// instead of answering it as a question (Sacha 29/10/2026, proto « Suite du
// Cadrage », « Vérifier en bloc »): the box asks only what nobody can
// confirm at a glance; the rest is confirmed dimension by dimension
// (« Confirmer les n », confirmDimension) or opened from its line to fix.

import {
  needsSomeone,
  type FramingAssessment,
  type QuestionState,
} from "@/lib/framing/assess";
import { QUESTIONS, type QuestionDef } from "@/lib/framing/dimensions";
import type { FramingKnowledge } from "@/lib/framing/knowledge";

/**
 * A proposal confirmed as it stands, exactly as « Confirmer » would. Never:
 * a legal party (qualified one by one, PROJ-BUG-03), a sentence where a
 * structure is asked (precised first, PROJ-UX-04/05), a question caught in
 * a contradiction (PROJ-BUG-04), deadlines while one has no date yet.
 */
export function toVerify(
  assessment: FramingAssessment,
  k: Pick<FramingKnowledge, "deadlines">,
): QuestionState[] {
  const held = new Set<string>(assessment.conflicts.map((c) => c.question));
  if (k.deadlines.some((d) => d.review_status === "proposed" && !d.due_date))
    held.add("deadlines");
  return assessment.dimensions
    .flatMap((d) => d.questions)
    .filter((q) => {
      const def: QuestionDef = QUESTIONS[q.key];
      if (q.status !== "to_confirm" || held.has(q.key)) return false;
      if (def.kind === "parties") return false;
      return !(
        def.shape &&
        q.answer?.kind === "text" &&
        !q.answer.items &&
        !q.answer.measures
      );
    });
}

/** The questions left to answer in the box, the proposals apart. */
export const openQuestions = (
  questions: QuestionState[],
  verified: ReadonlySet<string>,
) => questions.filter((q) => !verified.has(q.key) && needsSomeone(q)).length;
