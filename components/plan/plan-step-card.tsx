import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
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
 * A step of the plan, one row of its group (proto « Suite du Cadrage »,
 * Sacha 29/10/2026; PROJ-UX-07): « **Stratégie** · Marketing », why it is
 * there, its real state once it runs and what does not hold; its pilot and
 * due date beside it; `actions` on the right (« Modifier », « Lancer
 * maintenant »); `below`: the row's editor.
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
      className="grid scroll-mt-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="break-words">
          <span className="font-semibold">{title}</span>
          {group && (
            <span className="text-caption text-[color:var(--text-secondary)]">
              {" "}
              · {group}
            </span>
          )}
        </p>
        {why && (
          <p className="text-caption text-[color:var(--text-secondary)]">
            {why}
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
          <ul className="mt-1 flex flex-col gap-1 rounded-lg bg-[var(--tone-warning-bg)] px-3 py-2 text-caption text-[color:var(--tone-warning-fg)]">
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
      </div>
      <div className="col-start-1 row-start-2 flex min-w-0 items-center gap-2 md:col-start-auto md:row-start-auto">
        {!muted && (
          <>
            <Avatar name={pilot ?? tp.noOwner} pictureUrl={null} />
            <span className="flex min-w-0 flex-col text-body-sm">
              <span className="truncate">{pilot ?? tp.noOwner}</span>
              {dueDate && (
                <span className="text-caption text-[color:var(--text-secondary)]">
                  {formatDay(dueDate)}
                </span>
              )}
            </span>
          </>
        )}
      </div>
      <div className="col-start-2 row-span-2 row-start-1 flex flex-wrap justify-end gap-1 md:col-start-auto md:row-span-1 md:row-start-auto">
        {actions}
      </div>
      {below && <div className="col-span-full">{below}</div>}
    </li>
  );
}
