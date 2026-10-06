// Who is asked what of the Brief Mix/Master (ticket "Workflow Master", § 6:
// « ne pas demander systématiquement toutes les informations au Chef de
// projet »). A rule written by code, never a model's guess: what the brief
// lacks on the artistic side goes to the project's creative directors; the
// rest (engineers, rates, calendar) stays with the owner, who pilots.
// Client-safe.

import type { BriefPerson } from "@/lib/master-workflow/brief-types";
import {
  QUESTION_DIMENSIONS,
  questionDeliverablesOf,
  type QuestionDimension,
  type QuestionToAsk,
} from "@/lib/master-workflow/question-types";

type BriefState = { direction: string | null; deliverables: readonly string[] };

/** What the brief does not say yet, among what others can answer. */
export function missingDimensions(brief: BriefState): QuestionDimension[] {
  return QUESTION_DIMENSIONS.filter((dimension) =>
    dimension === "direction"
      ? !brief.direction?.trim()
      : // Only the two masters: nobody has said what else is expected.
        questionDeliverablesOf(brief.deliverables).length === 0,
  );
}

/**
 * The questions to ask: each missing dimension to each creative director
 * of the project (the owner excepted) who was never asked it — an answer,
 * even « rien d'autre », is not asked twice.
 */
export function questionsToAsk(
  brief: BriefState,
  creatives: BriefPerson[],
  asked: Array<{ dimension: string; personId: string }>,
  ownerPersonId: string | null,
): QuestionToAsk[] {
  const responsible = creatives.filter(
    (person) => person.personId !== ownerPersonId,
  );
  return missingDimensions(brief).flatMap((dimension) => {
    const people = responsible.filter(
      (person) =>
        !asked.some(
          (q) => q.dimension === dimension && q.personId === person.personId,
        ),
    );
    return people.length > 0 ? [{ dimension, people }] : [];
  });
}
