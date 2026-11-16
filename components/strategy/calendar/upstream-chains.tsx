import { formatMilestoneDate } from "@/components/strategy/calendar/milestone-row";
import { UpstreamArbitration } from "@/components/strategy/calendar/upstream-arbitration";
import { UpstreamProposals } from "@/components/strategy/calendar/upstream-proposals";
import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { strategy } from "@/lib/i18n/fr/strategy";
import { strategyCalendar } from "@/lib/i18n/fr/strategy-calendar";
import { dayOffset } from "@/lib/strategy/calendar";
import {
  UPSTREAM_STEPS,
  upstreamMilestones,
  type UpstreamChain,
  type UpstreamDeliverable,
  type UpstreamStepKey,
} from "@/lib/strategy/upstream";
import { overdueTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { strategy, strategyCalendar };

/**
 * « Échéances amont »: per deliverable linked to a milestone, the
 * conception, production and validation deadlines counted back by code
 * (lib/strategy/upstream.ts), each with its lead time and its margin from
 * today. A deadline really past says so and, for the owner, offers its
 * arbitrations (MKT-S1-04).
 */
export function UpstreamChains({
  chains,
  referenceDate,
  deliverables,
  milestones,
  today,
  projectId,
  canEdit,
  onMoveMilestone,
}: {
  chains: UpstreamChain[];
  // The calendar's milestones: upstream ones already there are not proposed.
  milestones: Array<{ kind: string; deliverable_id: string | null }>;
  today: string;
  referenceDate: string | null;
  deliverables: UpstreamDeliverable[];
  projectId: string;
  canEdit: boolean;
  onMoveMilestone: (milestoneId: string) => void;
}) {
  const leadsOf = (id: string) => {
    const d = deliverables.find((x) => x.id === id);
    return Object.fromEntries(
      UPSTREAM_STEPS.map((key) => [key, d?.[`${key}_lead_days`] ?? null]),
    ) as Record<UpstreamStepKey, number | null>;
  };
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
              className="flex flex-col gap-3 rounded-2xl bg-[var(--surface-tint)] px-4 py-3.5 modern:py-3"
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
                    <span className="text-caption text-muted-foreground tabular-nums">
                      {/* No margin once the milestone itself is behind. */}
                      {step.marginDays < 0 && !step.passed
                        ? c.lead(step.leadDays)
                        : `${c.lead(step.leadDays)} · ${c.margin(step.marginDays)}`}
                    </span>
                    {step.late && (
                      <span>
                        <StatusBadge tone={overdueTone} size="sm">
                          {c.late}
                        </StatusBadge>
                      </span>
                    )}
                    {step.passed && chain.riskAccepted && (
                      <span>
                        <StatusBadge tone="neutral" size="sm">
                          {c.riskAccepted}
                        </StatusBadge>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              {chain.customLeads && (
                <span className="text-caption text-muted-foreground">
                  {c.customLeads}
                </span>
              )}
              {canEdit && (
                <>
                  <UpstreamArbitration
                    projectId={projectId}
                    chain={chain}
                    current={leadsOf(chain.deliverableId)}
                    today={today}
                    onMoveMilestone={() => onMoveMilestone(chain.milestoneId)}
                  />
                  <span>
                    <UpstreamProposals
                      projectId={projectId}
                      proposals={upstreamMilestones(chain, milestones, today)}
                    />
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
