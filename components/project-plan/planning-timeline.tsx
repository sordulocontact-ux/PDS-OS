import Link from "next/link";
import { Fragment } from "react";

import {
  formatMonth,
  formatTime,
  formatWeekday,
} from "@/components/project-plan/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { TimelineItem, TimelineMonth } from "@/lib/project-plan/timeline";
import { dayOffset, isMilestoneChannel } from "@/lib/strategy/calendar";
import { overdueTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

type MilestoneKind = keyof typeof fr.strategy.calendar.kinds;

function TodayMarker() {
  return (
    <li className="flex items-center gap-3 py-1" aria-current="date">
      <span className="text-caption font-semibold text-foreground">
        {fr.projectPlan.planning.today}
      </span>
      <span aria-hidden className="h-px flex-1 bg-foreground" />
    </li>
  );
}

function TimelineRow({
  item,
  today,
  reference,
}: {
  item: TimelineItem;
  today: string;
  reference: string | null;
}) {
  const t = fr.projectPlan.planning;
  const past = item.date < today;
  const c = fr.strategyCalendar;
  const kind =
    item.kind === "upstream"
      ? c.upstream.planningKind
      : item.kind === "milestone" && item.milestoneKind
        ? fr.strategy.calendar.kinds[item.milestoneKind as MilestoneKind]
        : t.kinds[item.kind];
  const line =
    item.kind === "milestone"
      ? [
          t.kinds.milestone,
          kind,
          isMilestoneChannel(item.channel) && c.channels[item.channel],
        ]
          .filter(Boolean)
          .join(" · ")
      : item.upstream
        ? `${kind} · ${c.upstream.planningLine(
            c.upstream.steps[item.upstream.step],
            item.upstream.milestoneTitle,
          )}`
        : item.occurredAt
          ? `${kind} · ${formatTime(item.occurredAt)}`
          : kind;

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "-mx-2 grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg px-2 py-2 hover:bg-[var(--control-bg-hover)]",
          past && "text-muted-foreground",
        )}
      >
        <span className="grid gap-0.5 text-sm tabular-nums">
          <span className="font-medium">{formatWeekday(item.date)}</span>
          {reference && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {fr.strategy.calendar.dayOffset(dayOffset(item.date, reference))}
            </span>
          )}
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span
            className={cn(
              "text-sm font-medium break-words",
              item.done && "line-through",
            )}
          >
            {item.title}
          </span>
          <span className="text-xs text-muted-foreground">{line}</span>
        </span>
        {item.done ? (
          <StatusBadge tone="success" size="sm">
            {t.taskDone}
          </StatusBadge>
        ) : item.upstream?.late ? (
          <StatusBadge tone={overdueTone} size="sm">
            {c.upstream.late}
          </StatusBadge>
        ) : (
          <span />
        )}
      </Link>
    </li>
  );
}

/** Dated items month by month; the past is greyed and today is marked. */
export function PlanningTimeline({
  months,
  today,
  reference,
}: {
  months: TimelineMonth[];
  today: string;
  reference: string | null;
}) {
  const items = months.flatMap((m) => m.items);
  // Today sits before the first item not yet past, else after the last one.
  const next = items.find((i) => i.date >= today);
  const markerBefore = next?.key ?? null;
  const lastMonth = months.at(-1)?.month;

  return (
    <div className="grid gap-6">
      {months.map((month) => (
        <section
          key={month.month}
          aria-labelledby={`month-${month.month}`}
          className="grid gap-2"
        >
          <h3
            id={`month-${month.month}`}
            className="text-base font-medium first-letter:uppercase"
          >
            {formatMonth(month.month)}
          </h3>
          <ol className="grid gap-1">
            {month.items.map((item) => (
              <Fragment key={item.key}>
                {item.key === markerBefore && <TodayMarker />}
                <TimelineRow item={item} today={today} reference={reference} />
              </Fragment>
            ))}
            {!markerBefore && month.month === lastMonth && <TodayMarker />}
          </ol>
        </section>
      ))}
    </div>
  );
}
