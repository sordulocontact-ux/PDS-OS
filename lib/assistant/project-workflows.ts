import "server-only";

import { fr } from "@/lib/i18n/fr";
import { loadWorkflowProgress } from "@/lib/overview/workflow-progress";

/**
 * Where each workflow of a launched project stands, for find_projects: a
 * launched project runs Master, Juridique, Marketing and Distribution side
 * by side, so its one « current stage » does not say it is « at the
 * Master » (bug of 03/11/2026). Null before « Lancer le plan ». Written by
 * code, in the words of the overview's cards.
 */
export async function workflowLines(
  projectId: string,
): Promise<string[] | null> {
  const cards = await loadWorkflowProgress(projectId);
  return (
    cards?.map((card) =>
      fr.assistant.workflowLine(
        fr.shell.project.sidebar[card.workflow],
        fr.workflowStatus.statuses[card.status],
        card.index,
        card.total,
        card.stepTitle,
      ),
    ) ?? null
  );
}
