// Where a blocker or a note of a Production step belongs: the step of one
// deliverable (sub-lot C6, `step_blockers` / `step_notes`). Client-safe.

import {
  stepChoiceKey,
  type StepChoice,
  type StepRef,
} from "@/lib/step-tools/model";

export const productionStepRef = (
  projectId: string,
  deliverableId: string,
  stepKey: string,
): StepRef => ({
  projectId,
  module: "production",
  stepKey,
  subjectId: deliverableId,
});

/** The steps of the deliverable, for « Étape concernée ». */
export const productionStepChoices = (
  deliverableId: string,
  steps: ReadonlyArray<{ key: string; title: string }>,
): StepChoice[] =>
  steps.map((s) => ({
    key: stepChoiceKey({
      module: "production",
      stepKey: s.key,
      subjectId: deliverableId,
    }),
    label: s.title,
  }));
