"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { MilestoneDialog } from "@/components/strategy/milestone-dialog";
import { labelClass, optionClass } from "@/components/strategy/option-class";
import { UpstreamChains } from "@/components/strategy/upstream-chains";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import { removeMilestone } from "@/lib/strategy/actions/plan";
import { dayOffset } from "@/lib/strategy/calendar";
import { CHANNELS, type Channel } from "@/lib/strategy/dimensions";
import type { StrategyData, Milestone } from "@/lib/strategy/queries";
import type { UpstreamChain } from "@/lib/strategy/upstream";
import { cn } from "@/lib/utils";

type Kind = keyof typeof fr.strategy.calendar.kinds;

/**
 * Calendrier de lancement (ticket § 5) at two levels: the milestones
 * relative to the release (each one opens to be edited), then the same by
 * channel; below, the upstream deadlines computed by code.
 */
export function CalendarBoard({
  milestones,
  deliverables,
  referenceDate,
  chains,
  projectId,
}: Pick<StrategyData, "milestones" | "deliverables" | "referenceDate"> & {
  chains: UpstreamChain[];
  projectId: string;
}) {
  const t = fr.strategyFlow.calendar;
  const tc = fr.strategy.calendar;
  const canEdit = useCanEditProject();
  const { pending, run } = useFramingAction();
  const [editing, setEditing] = useState<Milestone | "new" | null>(null);
  const offset = (date: string) =>
    referenceDate ? tc.dayOffset(dayOffset(date, referenceDate)) : "—";
  const deliverableName = new Map(deliverables.map((d) => [d.id, d.title]));
  const channels = CHANNELS.filter(
    (c) => c === "release" || milestones.some((m) => m.channel === c),
  );

  return (
    <div className="flex flex-col gap-8">
      <p className="text-caption text-muted-foreground">
        {referenceDate
          ? tc.reference(formatDay(referenceDate))
          : tc.noReference}
      </p>

      <section
        aria-labelledby="milestones-title"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="milestones-title" className="text-body-lg font-semibold">
            {t.milestonesTitle}
          </h3>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing("new")}
            >
              {t.add}
            </Button>
          )}
        </div>
        {milestones.length === 0 ? (
          <p className="text-body-md text-muted-foreground">{tc.empty}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {milestones.map((m) => (
              <li
                key={m.id}
                className={cn(
                  optionClass(false),
                  "grid grid-cols-[3.5rem_minmax(0,1fr)_auto]",
                )}
              >
                <span className="pt-0.5 text-caption font-semibold text-muted-foreground tabular-nums">
                  {offset(m.occurs_on)}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold break-words">{m.title}</span>
                    <StatusBadge tone="neutral" size="sm">
                      {tc.kinds[m.kind as Kind]}
                    </StatusBadge>
                    <StatusBadge tone="info" size="sm">
                      {t.channels[m.channel as Channel]}
                    </StatusBadge>
                  </div>
                  <span className="text-caption text-muted-foreground">
                    {[
                      formatDay(m.occurs_on),
                      m.deliverable_id && deliverableName.get(m.deliverable_id),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {m.notes && (
                    <p className="text-caption whitespace-pre-wrap text-muted-foreground">
                      {m.notes}
                    </p>
                  )}
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(m)}
                    >
                      {t.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      aria-label={tc.removeLabel(m.title)}
                      onClick={() =>
                        run(() => removeMilestone(projectId, m.id))
                      }
                    >
                      {tc.remove}
                    </Button>
                  </div>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {milestones.length > 0 && (
        <section
          aria-labelledby="channels-title"
          className="flex flex-col gap-3"
        >
          <h3 id="channels-title" className="text-body-lg font-semibold">
            {t.channelsTitle}
          </h3>
          <ul className="flex flex-col gap-2">
            {channels.map((channel) => {
              const items = milestones.filter((m) => m.channel === channel);
              return (
                <li
                  key={channel}
                  className="grid gap-2 rounded-2xl bg-[var(--surface-tint)] px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]"
                >
                  <span className={labelClass}>{t.channels[channel]}</span>
                  <span className="flex flex-wrap gap-2">
                    {items.length === 0 ? (
                      <span className="text-muted-foreground">
                        {t.noneInChannel}
                      </span>
                    ) : (
                      items.map((m) => (
                        <StatusBadge key={m.id} tone="neutral" size="md">
                          <span className="tabular-nums">
                            {offset(m.occurs_on)}
                          </span>
                          {m.title}
                        </StatusBadge>
                      ))
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <UpstreamChains chains={chains} />

      <MilestoneDialog
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        milestone={editing === "new" ? null : editing}
        deliverables={deliverables}
        projectId={projectId}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
