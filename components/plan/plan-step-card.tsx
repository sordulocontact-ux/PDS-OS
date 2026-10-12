import Link from "next/link";

import { StatusDot } from "@/components/ui/status-dot";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { PlanWorkflow } from "@/lib/plan/propose";
import type { StepIssue } from "@/lib/plan/steps";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import type { CommonStatus } from "@/lib/workflow-status/rules";

/** The anchor of a step in the board: its dependencies link to it. */
export const stepAnchor = (key: string) => `plan-step-${key}`;

/**
 * A step of the plan in its column (PROJ-UX-07): its real state, why it is
 * there, who pilots and who executes, for when, what it waits for (links
 * to those steps) and what does not hold. `actions`: the editing controls.
 */
export function PlanStepCard({
  stepKey,
  title,
  why,
  specialized,
  status,
  pilot,
  executor,
  dueDate,
  dependsOn,
  dependencyKey,
  issues,
  actions,
  muted = false,
}: {
  stepKey: string;
  title: string;
  why: string | null;
  specialized: string | null;
  // Null: not a workflow (a note, an added step) or not readable.
  status: CommonStatus | null;
  pilot: string | null;
  executor: string | null;
  dueDate: string | null;
  dependsOn: PlanWorkflow[];
  // The key of the step a dependency points at, when it is on the board.
  dependencyKey: (workflow: PlanWorkflow) => string | null;
  issues: StepIssue[];
  actions?: React.ReactNode;
  // A note of « À anticiper »: no pilot, no status.
  muted?: boolean;
}) {
  const t = fr.planSteps;
  const tp = fr.framingIntel.plan;
  return (
    <li
      id={stepAnchor(stepKey)}
      className="flex scroll-mt-24 flex-col gap-2 rounded-2xl border border-border bg-background p-3"
    >
      <p className="text-body-md font-semibold break-words">{title}</p>
      {status && (
        <StatusDot
          tone={workflowStatusTone[status]}
          label={fr.workflowStatus.statuses[status]}
          showLabel
          className="text-caption text-muted-foreground"
        />
      )}
      {why && <p className="text-caption text-muted-foreground">{why}</p>}
      {specialized && (
        <p className="text-caption">{tp.specialized(specialized)}</p>
      )}
      {!muted && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-caption">
          <dt className="text-muted-foreground">{t.pilot}</dt>
          <dd>{pilot ?? tp.noOwner}</dd>
          <dt className="text-muted-foreground">{t.executor}</dt>
          <dd>{executor ?? t.executorSame}</dd>
          <dt className="text-muted-foreground">{t.due}</dt>
          <dd>{dueDate ? formatBriefDate(dueDate) : t.noDue}</dd>
          {dependsOn.length > 0 && (
            <>
              <dt className="text-muted-foreground">{t.dependsOn}</dt>
              <dd className="flex flex-wrap gap-x-2">
                {dependsOn.map((w) => {
                  const key = dependencyKey(w);
                  return key ? (
                    <Link
                      key={w}
                      href={`#${stepAnchor(key)}`}
                      className="underline underline-offset-4"
                    >
                      {tp.workflows[w]}
                    </Link>
                  ) : (
                    <span key={w}>{tp.workflows[w]}</span>
                  );
                })}
              </dd>
            </>
          )}
        </dl>
      )}
      {issues.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl bg-[var(--tone-warning-bg)] px-3 py-2 text-caption text-[color:var(--tone-warning-fg)]">
          {issues.map((issue) => (
            <li key={issue.text}>
              {issue.href ? (
                <Link
                  href={issue.href}
                  className="underline underline-offset-4"
                >
                  {issue.text}
                </Link>
              ) : (
                issue.text
              )}
            </li>
          ))}
        </ul>
      )}
      {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
    </li>
  );
}
