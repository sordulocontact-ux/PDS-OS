import { IconCalendarDays } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { CardRow } from "@/components/ui/list-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import { formatDate, formatShortDate } from "@/lib/release/format";
import type { BoardDeadline } from "@/lib/workflow-status/board";

const workflowName = (workflow: string | null) =>
  workflow
    ? fr.shell.project.sidebar[
        workflow as "master" | "legal" | "marketing" | "distribution"
      ]
    : null;

/**
 * The next dated milestone in large, then the ones after it and the late
 * ones, then the way to the project's planning (maquette 01, « Prochaine
 * échéance »). The dates come from the workflows (lib/workflow-status/
 * board.ts), the order too: late first, then by date.
 */
export function DeadlinesCard({
  deadlines,
  planningHref,
}: {
  deadlines: BoardDeadline[];
  planningHref: string;
}) {
  const t = fr.workflowStatus.board.deadlines;
  const next = deadlines.find((deadline) => !deadline.overdue) ?? null;
  const others = deadlines.filter((deadline) => deadline !== next);
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <h2 className="text-caption text-grey-400">{t.title}</h2>
      {next ? (
        <ViewLink
          href={next.href}
          className="-m-2 flex items-start gap-3 rounded-xl p-2 no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-soft)]"
        >
          <IconCalendarDays aria-hidden className="mt-1 size-5 shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="text-xl font-semibold tabular-nums">
              {formatDate(next.date)}
            </span>
            <span className="text-body-md text-muted-foreground">
              {[next.label, workflowName(next.workflow)]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        </ViewLink>
      ) : (
        others.length === 0 && (
          <p className="text-body-md text-muted-foreground">{t.empty}</p>
        )
      )}
      {others.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-caption text-grey-400">{t.later}</h3>
          <ul className="grid gap-1">
            {others.map((deadline) => (
              <CardRow
                key={deadline.key}
                href={deadline.href}
                main={deadline.label}
                sub={workflowName(deadline.workflow) ?? undefined}
                badge={
                  deadline.overdue ? (
                    <StatusBadge tone="warning" size="sm">
                      {fr.workflowStatus.board.actions.overdue}
                    </StatusBadge>
                  ) : (
                    <span className="text-caption text-muted-foreground tabular-nums">
                      {formatShortDate(deadline.date)}
                    </span>
                  )
                }
              />
            ))}
          </ul>
        </div>
      )}
      <ViewLink
        href={planningHref}
        className={buttonVariants({
          variant: "outline",
          className: "w-full",
        })}
      >
        <IconCalendarDays aria-hidden />
        {t.planning}
      </ViewLink>
    </section>
  );
}
