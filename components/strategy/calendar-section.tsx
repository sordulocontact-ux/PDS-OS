"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  labelClass,
  optionClass,
  sectionTitleClass,
} from "@/components/strategy/option-class";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { addMilestone, removeMilestone } from "@/lib/strategy/actions/plan";
import { dayOffset } from "@/lib/strategy/calendar";
import type { StrategyData } from "@/lib/strategy/queries";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const format = (date: string) =>
  dateFormat.format(new Date(`${date}T12:00:00`));
const NONE = "none";

type Kind = keyof typeof fr.strategy.calendar.kinds;

/** Milestones entered by hand; the countdown is date arithmetic in code. */
export function CalendarSection({
  milestones,
  deliverables,
  referenceDate,
  projectId,
}: Pick<StrategyData, "milestones" | "deliverables" | "referenceDate"> & {
  projectId: string;
}) {
  const t = fr.strategy.calendar;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const deliverableName = new Map(deliverables.map((d) => [d.id, d.title]));

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<Kind>("announcement");
  const [deliverable, setDeliverable] = useState(NONE);

  return (
    <section aria-labelledby="calendar-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 id="calendar-title" className={sectionTitleClass}>
          {t.title}
        </h3>
        <p className="text-caption text-muted-foreground">
          {referenceDate ? t.reference(format(referenceDate)) : t.noReference}
        </p>
      </div>

      {milestones.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
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
                {referenceDate
                  ? t.dayOffset(dayOffset(m.occurs_on, referenceDate))
                  : "—"}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold break-words">{m.title}</span>
                  <StatusBadge tone="neutral" size="sm">
                    {t.kinds[m.kind as Kind]}
                  </StatusBadge>
                </div>
                <span className="text-caption text-muted-foreground">
                  {[
                    format(m.occurs_on),
                    m.deliverable_id && deliverableName.get(m.deliverable_id),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {canEdit ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  aria-label={t.removeLabel(m.title)}
                  onClick={() => run(() => removeMilestone(projectId, m.id))}
                >
                  {t.remove}
                </Button>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ol>
      )}

      {canEdit && (
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () =>
                addMilestone(projectId, {
                  title,
                  occursOn: date,
                  kind,
                  deliverableId: deliverable === NONE ? "" : deliverable,
                }),
              () => {
                setTitle("");
                setDate("");
                setDeliverable(NONE);
              },
            );
          }}
        >
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="milestone-title" className={labelClass}>
              {t.name}
            </Label>
            <Input
              id="milestone-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="milestone-date" className={labelClass}>
              {t.date}
            </Label>
            <Input
              id="milestone-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="milestone-kind" className={labelClass}>
              {t.kind}
            </Label>
            <OptionSelect
              id="milestone-kind"
              label={t.kind}
              options={t.kinds}
              value={kind}
              onChange={(v) => setKind(v as Kind)}
            />
          </div>
          {deliverables.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="milestone-deliverable" className={labelClass}>
                {t.deliverable}
              </Label>
              <OptionSelect
                id="milestone-deliverable"
                label={t.deliverable}
                options={{
                  [NONE]: t.noDeliverable,
                  ...Object.fromEntries(
                    deliverables.map((d) => [d.id, d.title]),
                  ),
                }}
                value={deliverable}
                onChange={setDeliverable}
              />
            </div>
          )}
          <Button
            type="submit"
            variant="outline"
            className="self-end justify-self-start"
            disabled={pending || title.trim() === "" || date === ""}
          >
            {fr.framing.actions.add}
          </Button>
        </form>
      )}
    </section>
  );
}
