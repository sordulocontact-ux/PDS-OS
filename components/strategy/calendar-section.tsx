"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { ChannelView } from "@/components/strategy/calendar/channel-view";
import { MilestoneForm } from "@/components/strategy/calendar/milestone-form";
import {
  MilestoneRow,
  formatMilestoneDate,
} from "@/components/strategy/calendar/milestone-row";
import { UpstreamChains } from "@/components/strategy/calendar/upstream-chains";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { TabBar } from "@/components/ui/tab-bar";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import {
  addMilestone,
  removeMilestone,
  updateMilestone,
} from "@/lib/strategy/actions/plan";
import type { Milestone, StrategyData } from "@/lib/strategy/queries";
import { upstreamChains } from "@/lib/strategy/upstream";

type View = "milestones" | "channels";

/**
 * Calendrier de lancement (ticket Stratégie § 5): the milestones typed by
 * the team, read two ways — by date relative to the release, or by channel —
 * and the upstream deadlines of the deliverables they bring out. Every
 * countdown and deadline is date arithmetic in code.
 */
export function CalendarSection({
  milestones,
  deliverables,
  referenceDate,
  projectId,
}: Pick<StrategyData, "milestones" | "deliverables" | "referenceDate"> & {
  projectId: string;
}) {
  const t = fr.strategy.calendar;
  const c = fr.strategyCalendar;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [view, setView] = useState<View>("milestones");
  // The milestone open in the dialog, or "new" for a new one.
  const [open, setOpen] = useState<Milestone | "new" | null>(null);

  const titles = new Map(deliverables.map((d) => [d.id, d.title]));
  const deliverableTitle = (id: string | null) =>
    id ? (titles.get(id) ?? null) : null;
  const onOpen = canEdit ? (m: Milestone) => setOpen(m) : undefined;
  const today = todayInParis();
  const chains = upstreamChains(
    milestones.map((m) => ({
      id: m.id,
      title: m.title,
      occursOn: m.occurs_on,
      deliverableId: m.deliverable_id,
    })),
    deliverables,
    today,
  );
  const editing = open === "new" ? null : open;
  const close = () => setOpen(null);

  return (
    <section aria-labelledby="calendar-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {/* Named by the panel title: kept for the section label. */}
        <h3 id="calendar-title" className="sr-only">
          {t.title}
        </h3>
        <p className="text-caption text-muted-foreground">
          {referenceDate
            ? t.reference(formatMilestoneDate(referenceDate))
            : t.noReference}
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <TabBar
          label={c.views.label}
          items={(["milestones", "channels"] as const).map((key) => ({
            label: c.views[key],
            current: view === key,
            onSelect: () => setView(key),
          }))}
        />
        {canEdit && (
          <Button variant="outline" onClick={() => setOpen("new")}>
            <IconPlus aria-hidden data-icon="inline-start" />
            {c.add}
          </Button>
        )}
      </div>

      {view === "channels" ? (
        <ChannelView
          milestones={milestones}
          referenceDate={referenceDate}
          deliverableTitle={deliverableTitle}
          onOpen={onOpen}
        />
      ) : milestones.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {milestones.map((m) => (
            <li key={m.id}>
              <MilestoneRow
                milestone={m}
                referenceDate={referenceDate}
                deliverableTitle={deliverableTitle(m.deliverable_id)}
                onOpen={onOpen && (() => onOpen(m))}
              />
            </li>
          ))}
        </ol>
      )}

      <UpstreamChains
        chains={chains}
        referenceDate={referenceDate}
        deliverables={deliverables}
        milestones={milestones}
        today={today}
        projectId={projectId}
        canEdit={canEdit}
        onMoveMilestone={(id) => {
          const milestone = milestones.find((m) => m.id === id);
          if (milestone) setOpen(milestone);
        }}
      />

      {canEdit && (
        <FormDialog
          open={open !== null}
          onOpenChange={(next) => !next && close()}
          title={editing ? c.dialog.editTitle : c.dialog.addTitle}
          description={c.dialog.description}
          closeLabel={c.dialog.close}
          size="wide"
        >
          <MilestoneForm
            milestone={editing}
            referenceDate={referenceDate}
            deliverables={deliverables}
            pending={pending}
            onSubmit={(input) =>
              run(
                () =>
                  editing
                    ? updateMilestone(projectId, editing.id, input)
                    : addMilestone(projectId, input),
                close,
              )
            }
            onRemove={
              editing
                ? () => run(() => removeMilestone(projectId, editing.id), close)
                : undefined
            }
          />
        </FormDialog>
      )}
    </section>
  );
}
