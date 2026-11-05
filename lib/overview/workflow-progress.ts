import "server-only";

import { shell } from "@/lib/i18n/fr/shell";
import { type WorkflowCard, workflowCards } from "@/lib/overview/cards";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { planLaunchedAt } from "@/lib/plan/queries";
import type { ActiveWorkflow, ProjectListItem } from "@/lib/projects/types";
import { OPEN_STATUSES } from "@/lib/ui/journey";
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

/**
 * The Cadrage's current step before « Lancer le plan », short label
 * (« Démarrage », « 6 dimensions », « Brief de cadrage », « Plan du
 * projet »): the step its journey stands at, the same rule as the overview's
 * cards (lib/overview/cards.ts). Null when the Cadrage has no journey.
 * loadShellJourneys is already read (and cached) by loadWorkflowProgress.
 */
async function loadFramingStep(projectId: string): Promise<string | null> {
  const { journeys } = await loadShellJourneys(projectId);
  const steps = journeys
    .filter((j) => j.module === "framing")
    .flatMap((j) => j.steps);
  const current =
    steps.find((s) => OPEN_STATUSES.includes(s.status)) ??
    steps.find((s) => s.status !== "done" && s.status !== "obsolete") ??
    steps.at(-1);
  if (!current) return null;
  return shell.progress.framingSteps[current.key] ?? current.title;
}

/** The projects of a list with the workflows they are at (Étape column);
 * before the plan, the Cadrage's step. */
export async function withActiveWorkflows(
  projects: ProjectListItem[],
): Promise<ProjectListItem[]> {
  const progress = await Promise.all(
    projects.map(async (p) => {
      if (p.status !== "launched") return null;
      const cards = await loadWorkflowProgress(p.id);
      // Not launched yet: the Cadrage (or its plan) is where it stands.
      if (cards || !p.currentStage) return { cards, framingStep: null };
      return { cards: null, framingStep: await loadFramingStep(p.id) };
    }),
  );
  return projects.map((p, i) => {
    const { cards = null, framingStep = null } = progress[i] ?? {};
    if (framingStep) return { ...p, framingStep };
    if (!cards) return p;
    const activeWorkflows: ActiveWorkflow[] = cards
      .filter((card) => ACTIVE.has(card.status))
      .map((card) => ({ workflow: card.workflow, step: card.stepTitle }));
    return { ...p, activeWorkflows };
  });
}
