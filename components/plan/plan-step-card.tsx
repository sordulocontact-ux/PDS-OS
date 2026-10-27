import Link from "next/link";

import { StatusDot } from "@/components/ui/status-dot";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { workflowStatus } from "@/lib/i18n/fr/workflow-status";
import type { StepIssue } from "@/lib/plan/steps";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import type { CommonStatus } from "@/lib/workflow-status/rules";

const fr = { framingIntel, workflowStatus };

/** The anchor of a step in the board: its dependencies link to it. */
export const stepAnchor = (key: string) => `plan-step-${key}`;

/**
 * A step of the plan in its column (proto frPlanView `.pcard`, PROJ-UX-07):
 * « **Stratégie** · Marketing », why it is there, « pilote · échéance »,
 * its real state once it runs, and what does not hold. `actions`: the
 * editing controls; `below`: the column and pilot menus of « Modifier le
 * plan ».
 */
export function PlanStepCard({
  stepKey,
  title,
  group,
  why,
  specialized,
  status,
  pilot,
  dueDate,
  issues,
  actions,
  below,
  muted = false,
}: {
  stepKey: string;
  title: string;
  // « Marketing » for its parts.
  group?: string | null;
  why: string | null;
  specialized: string | null;
  // Null: not a workflow (a note, an added step) or not readable.
  status: CommonStatus | null;
  pilot: string | null;
  dueDate: string | null;
  issues: StepIssue[];
  actions?: React.ReactNode;
  below?: React.ReactNode;
  // A note of « À anticiper »: no pilot, no status.
  muted?: boolean;
}) {
  const tp = fr.framingIntel.plan;
  return (
    <li
      id={stepAnchor(stepKey)}
      className="flex scroll-mt-24 flex-col gap-1 rounded-xl border border-[color:var(--border-hairline)] bg-card p-3"
    >
      <p className="break-words">
        <span className="text-body-md font-semibold">{title}</span>
        {group && (
          <span className="text-caption text-[color:var(--text-secondary)]">
            {" "}
            · {group}
          </span>
        )}
      </p>
      {why && (
        <p className="text-caption text-[color:var(--text-secondary)]">{why}</p>
      )}
      {!muted && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {[pilot ?? tp.noOwner, dueDate ? formatDay(dueDate) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {specialized && (
        <p className="text-caption">{tp.specialized(specialized)}</p>
      )}
      {status && (
        <StatusDot
          tone={workflowStatusTone[status]}
          label={fr.workflowStatus.statuses[status]}
          showLabel
          className="text-caption text-[color:var(--text-secondary)]"
        />
      )}
      {issues.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-[var(--tone-warning-bg)] px-3 py-2 text-caption text-[color:var(--tone-warning-fg)]">
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
      {below}
      {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
    </li>
  );
}
