// The steps of the Plan du projet, made pilotable (PROJ-UX-07): each step's
// real state read from its workflow, and what does not hold (a column that
// contradicts the real progress, a dependency placed later, a due date past
// the target, a Brief changed since its validation). Decided by code from
// the workflows' states (rule 6), never stored. Client-safe.

import { formatBriefDate } from "@/lib/framing/assess";
import type { BriefChange } from "@/lib/framing/brief-snapshot";
import type { Dimension } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";
import type { PlanColumn, PlanWorkflow } from "@/lib/plan/propose";
import type {
  CommonStatus,
  Dependency,
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

export type StepIssue = { text: string; href?: string };

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

// What happens first: Focus and Pendant ce temps now, Ensuite after.
const RANK: Record<PlanColumn, number> = {
  focus: 0,
  meanwhile: 0,
  next: 1,
  anticipate: 2,
};

// The workflows a dimension of the Cadrage feeds: a change there makes the
// steps built on it « à revoir ».
const FED_BY: Record<Dimension, PlanWorkflow[]> = {
  objective: ["strategy", "design", "activations"],
  timing: ["strategy", "master", "distribution"],
  budget: ["strategy", "design", "production", "master"],
  team: ["strategy", "master", "legal", "design", "production"],
  start: ["master", "design"],
  legal: ["legal", "distribution"],
};

/** The workflows a change of the validated Brief puts back to review. */
export function workflowsToReview(
  drift: BriefChange[],
): Map<PlanWorkflow, string[]> {
  const out = new Map<PlanWorkflow, string[]>();
  for (const change of drift)
    for (const workflow of FED_BY[change.dimension]) {
      const labels = out.get(workflow) ?? [];
      if (!labels.includes(change.label)) labels.push(change.label);
      out.set(workflow, labels);
    }
  return out;
}

const workflowName = (w: PlanWorkflow) => fr.framingIntel.plan.workflows[w];

/** Everything about a step that does not hold, in words, with a link when
 * the cause has a page. */
export function stepIssues(
  step: PlanStep,
  steps: PlanStep[],
  ctx: {
    states: States;
    targetDate: string | null;
    review: Map<PlanWorkflow, string[]>;
    dependencies: Dependency[];
  },
): StepIssue[] {
  const t = fr.planSteps.issues;
  const issues: StepIssue[] = [];
  const status = stepStatus(step, ctx.states);
  if (step.column === "next" && status === "done")
    issues.push({ text: t.doneLater });
  else if (
    step.column === "next" &&
    (status === "in_progress" || status === "waiting" || status === "blocked")
  )
    issues.push({ text: t.runningLater });
  if (status === "blocked" && step.workflow) {
    const flow = PLAN_FLOW[step.workflow];
    for (const dep of ctx.dependencies.filter(
      (d) => d.to === flow && d.state === "blocked",
    ))
      issues.push({ text: t.blocked(dep.note || dep.what), href: dep.href });
  }
  for (const workflow of step.dependsOn) {
    const dep = steps.find((s) => s.workflow === workflow);
    if (!dep) {
      issues.push({ text: t.dependencyRemoved(workflowName(workflow)) });
      continue;
    }
    if (
      RANK[dep.column] > RANK[step.column] &&
      stepStatus(dep, ctx.states) !== "done"
    )
      issues.push({ text: t.dependencyLater(workflowName(workflow)) });
    if (step.dueDate && dep.dueDate && step.dueDate < dep.dueDate)
      issues.push({ text: t.dueBeforeDependency(workflowName(workflow)) });
  }
  if (step.dueDate && ctx.targetDate && step.dueDate > ctx.targetDate)
    issues.push({ text: t.dueAfterTarget(formatBriefDate(ctx.targetDate)) });
  const labels = step.workflow ? ctx.review.get(step.workflow) : undefined;
  if (labels?.length) issues.push({ text: t.toReview(labels.join(", ")) });
  return issues;
}
