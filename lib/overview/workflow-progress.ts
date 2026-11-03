import "server-only";

import { type WorkflowCard, workflowCards } from "@/lib/overview/cards";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { planLaunchedAt } from "@/lib/plan/queries";
import type { ActiveWorkflow, ProjectListItem } from "@/lib/projects/types";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

export type ReadableCard = Extract<WorkflowCard, { restricted: false }>;

/**
 * Each workflow of a launched project as its overview's cards say it
 * (lib/overview/cards.ts): Master, Juridique, Marketing and Distribution run
 * side by side, so one « current stage » never says where it is (03/11/2026).
 * Null before « Lancer le plan »; a workflow the viewer may not read is left
 * out. Shared by the projects list and PO; kept per project version below.
 */
export async function loadWorkflowProgress(
  projectId: string,
): Promise<ReadableCard[] | null> {
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
  }).filter((card): card is ReadableCard => !card.restricted);
}

// What « being at » a workflow means in the list: it moves or waits.
const ACTIVE = new Set(["in_progress", "waiting"]);

/** The projects of a list with the workflows they are at (Étape column). */
export async function withActiveWorkflows(
  projects: ProjectListItem[],
): Promise<ProjectListItem[]> {
  const progress = await Promise.all(
    projects.map((p) =>
      p.status === "launched" ? loadWorkflowProgress(p.id) : null,
    ),
  );
  return projects.map((p, i) => {
    const cards = progress[i];
    if (!cards) return p;
    const activeWorkflows: ActiveWorkflow[] = cards
      .filter((card) => ACTIVE.has(card.status))
      .map((card) => ({ workflow: card.workflow, step: card.stepTitle }));
    return { ...p, activeWorkflows };
  });
}
