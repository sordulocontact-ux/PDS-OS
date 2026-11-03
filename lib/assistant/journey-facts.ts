import { formatDay } from "@/lib/assistant/facts";
import { assistant } from "@/lib/i18n/fr/assistant";
import type { ProjectAction, ProjectJourneys } from "@/lib/journey/types";

const fr = { assistant };

/** « À vous : « … » (Master › Mixage) »: one action, as PO reads it. */
export const actionLine = (action: ProjectAction, mine: boolean) => {
  const t = fr.assistant.myWork;
  const step = action.step;
  return t.projectAction({
    who: mine ? null : (step.actor?.name ?? null),
    todo: step.actor?.todo ?? step.title,
    place: `${action.place} › ${step.title}`,
    decision: step.actor?.kind === "validate",
    due: step.due ? formatDay(step.due) : null,
    late: step.alert === "overdue",
  });
};

/** One project's « Maintenant » for PO (project_status): the viewer's
 * actions, then what others are expected to do, read from the journeys
 * (lib/overview/journeys.ts), never from a list of its own. */
export function journeyFacts(journeys: ProjectJourneys): string[] {
  return [
    ...journeys.mine.map((a) => actionLine(a, true)),
    ...journeys.waiting.map((a) => actionLine(a, false)),
  ];
}
