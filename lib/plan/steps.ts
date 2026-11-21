// The steps of the Plan du projet, made pilotable (PROJ-UX-07): each step's
// real state read from its workflow. Decided by code from the workflows'
// states (rule 6), never stored. Client-safe.

import type { PlanColumn, PlanWorkflow } from "@/lib/plan/propose";
import type {
  CommonStatus,
  WorkflowKey,
  WorkflowState,
} from "@/lib/workflow-status/rules";

export type PlanStep = {
  key: string;
  column: PlanColumn;
  workflow: PlanWorkflow | null;
  title: string;
  ownerPersonId: string | null;
  executorPersonId: string | null;
  dueDate: string | null;
  dependsOn: PlanWorkflow[];
  // An added step a person marked done (never a workflow's).
  doneAt?: string | null;
};

// Where a plan workflow's progress is read (lib/workflow-status/).
export const PLAN_FLOW: Record<PlanWorkflow, WorkflowKey> = {
  strategy: "marketing",
  design: "marketing",
  production: "marketing",
  activations: "marketing",
  review: "marketing",
  master: "master",
  legal: "legal",
  distribution: "distribution",
};
// The Marketing's chevron each of its plan workflows stands for.
const MARKETING_STEP: Partial<Record<PlanWorkflow, string>> = {
  strategy: "strategy",
  design: "conception",
  production: "production",
};

type States = Partial<Record<WorkflowKey, WorkflowState | "restricted">>;

/** A workflow step's real state; null when it cannot be read (restricted,
 * not applicable) or for an added step (its own done mark). */
export function stepStatus(
  step: Pick<PlanStep, "workflow">,
  states: States,
): CommonStatus | null {
  if (!step.workflow) return null;
  const state = states[PLAN_FLOW[step.workflow]];
  if (!state || state === "restricted") return null;
  const chevron = MARKETING_STEP[step.workflow];
  // Activations, Suivi & bilan: no chevron of their own to read.
  if (!chevron)
    return PLAN_FLOW[step.workflow] === "marketing" ? null : state.status;
  if (state.done.includes(chevron)) return "done";
  return state.step === chevron ? state.status : "not_started";
}
