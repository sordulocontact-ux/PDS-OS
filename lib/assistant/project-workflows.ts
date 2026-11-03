import "server-only";

import { fr } from "@/lib/i18n/fr";
import { workflowCards } from "@/lib/overview/cards";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { planLaunchedAt } from "@/lib/plan/queries";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

/**
 * Where each workflow of a launched project stands, in the words of its
 * overview's cards (lib/overview/cards.ts): a launched project runs Master,
 * Juridique, Marketing and Distribution side by side, so its one « current
 * stage » does not say it is « at the Master » (bug of 03/11/2026: PO
 * found no project at the Master). Null before « Lancer le plan ». A
 * workflow the viewer may not read is left out. Written by code.
 */
export async function workflowLines(
  projectId: string,
): Promise<string[] | null> {
  const [launchedAt, flows, journeys] = await Promise.all([
    planLaunchedAt(projectId),
    loadWorkflowStates(projectId),
    loadShellJourneys(projectId),
  ]);
  if (!launchedAt || !flows) return null;
  return workflowCards({
    projectId,
    workflows: flows.workflows,
    states: flows.states,
    journeys,
  }).flatMap((card) =>
    card.restricted
      ? []
      : [
          fr.assistant.workflowLine(
            fr.shell.project.sidebar[card.workflow],
            fr.workflowStatus.statuses[card.status],
            card.index,
            card.total,
            card.stepTitle,
          ),
        ],
  );
}
