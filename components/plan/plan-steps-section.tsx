import { PlanHistory } from "@/components/plan/plan-history";
import {
  PlanStepsTable,
  type StepGroup,
  type StepRow,
} from "@/components/plan/plan-steps-table";
import { PageSection } from "@/components/shell/page-section";
import type { BriefChange } from "@/lib/framing/brief-snapshot";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { planSteps } from "@/lib/i18n/fr/plan-steps";
import { workflowStatus } from "@/lib/i18n/fr/workflow-status";
import type { LaunchedPlan } from "@/lib/plan/queries";
import {
  stepIssues,
  stepStatus,
  workflowsToReview,
  type PlanStep,
} from "@/lib/plan/steps";
import { formatDate } from "@/lib/release/format";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import type { WorkflowStates } from "@/lib/workflow-status/load";
import type { CommonStatus } from "@/lib/workflow-status/rules";

const fr = { framingIntel, planSteps, workflowStatus };

const GROUP: Record<CommonStatus, StepGroup> = {
  not_started: "next",
  in_progress: "active",
  waiting: "active",
  blocked: "blocked",
  done: "done",
};

/**
 * The launched plan's steps on the overview (PROJ-UX-07): each one's real
 * state read from its workflow (an added step: its done mark), what does not
 * hold, and the plan's history; who launched it, and when.
 */
export function PlanStepsSection({
  projectId,
  plan,
  flows,
  drift,
  targetDate,
  members,
  editable,
}: {
  projectId: string;
  plan: LaunchedPlan;
  flows: WorkflowStates;
  drift: BriefChange[];
  targetDate: string | null;
  members: Array<{ personId: string; name: string }>;
  editable: boolean;
}) {
  const t = fr.planSteps;
  const tp = fr.framingIntel.plan;
  const items = plan.items.filter(
    (item) => item.workflow !== null || item.column !== "anticipate",
  );
  const steps: PlanStep[] = items.map((item) => ({
    key: item.id,
    column: item.column,
    workflow: item.workflow,
    title: item.title,
    ownerPersonId: item.ownerPersonId,
    executorPersonId: item.executorPersonId,
    dueDate: item.dueDate,
    dependsOn: item.dependsOn,
    doneAt: item.doneAt,
  }));
  const ctx = {
    states: flows.states,
    targetDate,
    review: workflowsToReview(drift),
    dependencies: flows.dependencies,
  };
  const rows: StepRow[] = items.map((item, index) => {
    const step = steps[index];
    const status = stepStatus(step, flows.states);
    const sameColumn = items.filter((i) => i.column === item.column);
    const position = sameColumn.indexOf(item);
    return {
      id: item.id,
      title: item.title,
      workflow: item.workflow,
      group: status
        ? GROUP[status]
        : item.workflow === null && item.doneAt
          ? "done"
          : "next",
      statusLabel: status
        ? fr.workflowStatus.statuses[status]
        : item.workflow === null
          ? t.addedStatus[item.doneAt ? "done" : "open"]
          : t.noStatus,
      statusTone: status
        ? workflowStatusTone[status]
        : item.doneAt
          ? "success"
          : "neutral",
      pilot: item.ownerName,
      executor: item.executorName,
      dueDate: item.dueDate,
      dependsOn: item.dependsOn.map((w) => tp.workflows[w]),
      issues: stepIssues(step, steps, ctx),
      values: {
        column: item.column,
        title: item.workflow === null ? item.title : null,
        ownerPersonId: item.ownerPersonId,
        executorPersonId: item.executorPersonId,
        dueDate: item.dueDate,
        dependsOn: item.dependsOn,
      },
      first: position === 0,
      last: position === sameColumn.length - 1,
      doneAt: item.doneAt,
    };
  });

  return (
    <PageSection
      id="plan"
      title={t.board.title}
      description={`${t.board.body} ${t.launchedBy(formatDate(plan.launchedAt), plan.launchedByName)}.`}
    >
      <div className="flex flex-col gap-6">
        <PlanStepsTable
          projectId={projectId}
          rows={rows}
          members={members}
          editable={editable}
        />
        <PlanHistory events={plan.events} items={plan.items} />
      </div>
    </PageSection>
  );
}
