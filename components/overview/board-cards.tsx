import { CardRow, ListCard } from "@/components/ui/list-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import type { BoardAction, BoardDeadline } from "@/lib/workflow-status/board";

const workflowName = (workflow: string | null) =>
  workflow
    ? fr.shell.project.sidebar[
        workflow as "master" | "legal" | "marketing" | "distribution"
      ]
    : null;

const late = () => (
  <StatusBadge tone="warning" size="sm">
    {fr.workflowStatus.board.actions.overdue}
  </StatusBadge>
);

const dateBadge = (date: string) => (
  <span className="text-caption text-muted-foreground tabular-nums">
    {formatShortDate(date)}
  </span>
);

/** The next useful actions, late first, then by date: each opens where it
 * is done (ticket « Architecture globale » § 11). */
export function NextActionsCard({
  actions,
  limit = 6,
}: {
  actions: BoardAction[];
  limit?: number;
}) {
  const t = fr.workflowStatus.board.actions;
  return (
    <ListCard
      title={t.title}
      count={actions.length}
      empty={actions.length === 0 ? t.empty : undefined}
    >
      {actions.slice(0, limit).map((action) => (
        <CardRow
          key={action.key}
          href={action.href}
          main={action.title}
          sub={[workflowName(action.workflow), action.who, action.detail]
            .filter(Boolean)
            .join(" · ")}
          badge={
            action.overdue
              ? late()
              : action.due
                ? dateBadge(action.due)
                : undefined
          }
        />
      ))}
    </ListCard>
  );
}

/** The dated milestones ahead, and the late ones. */
export function DeadlinesCard({ deadlines }: { deadlines: BoardDeadline[] }) {
  const t = fr.workflowStatus.board.deadlines;
  return (
    <ListCard
      title={t.title}
      empty={deadlines.length === 0 ? t.empty : undefined}
    >
      {deadlines.map((deadline) => (
        <CardRow
          key={deadline.key}
          href={deadline.href}
          main={deadline.label}
          sub={workflowName(deadline.workflow) ?? undefined}
          badge={
            <span className="flex flex-col items-end gap-1">
              {dateBadge(deadline.date)}
              {deadline.overdue && late()}
            </span>
          }
        />
      ))}
    </ListCard>
  );
}
