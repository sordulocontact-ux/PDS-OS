import { formatMilestoneDate } from "@/components/strategy/calendar/milestone-row";
import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { dayOffset } from "@/lib/strategy/calendar";
import type { UpstreamChain } from "@/lib/strategy/upstream";
import { overdueTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

/**
 * « Échéances amont »: per deliverable linked to a milestone, the
 * conception, production and validation deadlines counted back by code
 * (lib/strategy/upstream.ts). A deadline already passed says so.
 */
export function UpstreamChains({
  chains,
  referenceDate,
}: {
  chains: UpstreamChain[];
  referenceDate: string | null;
}) {
  const c = fr.strategyCalendar.upstream;
  const day = (date: string) =>
    referenceDate
      ? `${fr.strategy.calendar.dayOffset(dayOffset(date, referenceDate))} · ${formatMilestoneDate(date)}`
      : formatMilestoneDate(date);

  return (
    <section aria-labelledby="upstream-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h4
          id="upstream-title"
          className="text-body-md font-semibold text-foreground"
        >
          {c.title}
        </h4>
        <p className="text-caption text-muted-foreground">{c.description}</p>
      </div>
      {chains.length === 0 ? (
        <EmptyNote>{c.empty}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-3">
          {chains.map((chain) => (
            <li
              key={chain.deliverableId}
              className="flex flex-col gap-3 rounded-2xl bg-[var(--surface-tint)] px-4 py-3.5"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold break-words">
                  {chain.deliverableTitle}
                </span>
                <span className="text-caption text-muted-foreground">
                  {c.forMilestone(
                    chain.milestoneTitle,
                    day(chain.milestoneDate),
                  )}
                </span>
              </span>
              <ol className="grid gap-2 sm:grid-cols-3">
                {chain.steps.map((step) => (
                  <li key={step.key} className="flex min-w-0 flex-col gap-1">
                    <span className="text-caption text-muted-foreground">
                      {c.steps[step.key]}
                    </span>
                    <span
                      className={cn(
                        "text-body-md font-medium tabular-nums",
                        step.late && "text-[color:var(--tone-danger-fg)]",
                      )}
                    >
                      {day(step.date)}
                    </span>
                    {step.late && (
                      <span>
                        <StatusBadge tone={overdueTone} size="sm">
                          {c.late}
                        </StatusBadge>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
