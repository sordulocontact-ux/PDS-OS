import { Avatar } from "@/components/ui/avatar";
import { StatusDot } from "@/components/ui/status-dot";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { workflowStatus } from "@/lib/i18n/fr/workflow-status";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import type { CommonStatus } from "@/lib/workflow-status/rules";

const fr = { framingIntel, workflowStatus };

/** The anchor of a step in the board: its dependencies link to it. */
export const stepAnchor = (key: string) => `plan-step-${key}`;

/**
 * A step of the plan, one card on its group's stop (Akili, 05/11/2026: a
 * visual plan; proto « Suite du Cadrage », PROJ-UX-07): « **Stratégie** ·
 * Marketing », why it is there, its real state once it runs; under it its pilot and due date, `actions` on the right
 * (« Modifier », « Lancer maintenant »); `below`: the step's editor. A note
 * of « À anticiper » (`muted`) is a quiet line, no pilot nor frame.
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
  actions?: React.ReactNode;
  below?: React.ReactNode;
  // A note of « À anticiper »: no pilot, no status.
  muted?: boolean;
}) {
  const tp = fr.framingIntel.plan;
  return (
    <li
      id={stepAnchor(stepKey)}
      className={cn(
        "flex min-w-0 scroll-mt-24 flex-col gap-3",
        muted
          ? "rounded-lg bg-[var(--surface-soft)] px-3.5 py-2.5 modern:px-3 modern:py-3"
          : "rounded-xl border border-[color:var(--border-hairline)] bg-card p-3.5 modern:p-4",
      )}
    >
      <div className="flex items-start justify-between gap-3">
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
        </div>
        {muted && actions && (
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {actions}
          </div>
        )}
      </div>
      {!muted && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={pilot ?? tp.noOwner} pictureUrl={null} />
            <span className="flex min-w-0 flex-col text-body-sm">
              <span className="truncate">{pilot ?? tp.noOwner}</span>
              {dueDate && (
                <span className="text-caption text-[color:var(--text-secondary)]">
                  {formatDay(dueDate)}
                </span>
              )}
            </span>
          </div>
          {actions && (
            <div className="flex flex-wrap justify-end gap-1">{actions}</div>
          )}
        </div>
      )}
      {below}
    </li>
  );
}
