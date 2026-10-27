"use client";

import { optionClass } from "@/components/ui/option-class";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { strategy } from "@/lib/i18n/fr/strategy";
import { strategyDeliverables } from "@/lib/i18n/fr/strategy-deliverables";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
import type { StrategyDeliverable } from "@/lib/strategy/queries";

const fr = { strategy, strategyDeliverables };

const dueFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** One committed deliverable: its name and number, who, when; edit, remove. */
export function DeliverableItem({
  deliverable: d,
  assigneeName,
  milestones = [],
  selected,
  onToggle,
  canEdit,
  pending,
  onEdit,
  onRemove,
}: {
  deliverable: StrategyDeliverable;
  assigneeName: string | null;
  // The milestones it is tied to (MKT-S1-10), by title.
  milestones?: string[];
  // Ticked for a bulk edition (MKT-S1-08).
  selected?: boolean;
  onToggle?: () => void;
  canEdit: boolean;
  pending: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = fr.strategy.deliverables;
  const s = fr.strategyDeliverables;
  const name = deliverableTitle(d.title, d.quantity);
  return (
    <li className={`${optionClass(false)} justify-between`}>
      <div className="flex min-w-0 items-start gap-3">
        {canEdit && onToggle && (
          <Checkbox
            className="mt-1"
            checked={selected ?? false}
            aria-label={s.bulk.select(name)}
            onChange={onToggle}
          />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold break-words">{name}</span>
          <span className="text-caption text-muted-foreground">
            {[
              d.format,
              d.assignee_person_id ? (assigneeName ?? "—") : t.noAssignee,
              d.due_date
                ? dueFormat.format(new Date(`${d.due_date}T00:00:00Z`))
                : t.noDueDate,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {milestones.length > 0 && (
            <span className="text-caption text-muted-foreground">
              {s.milestones(milestones.join(", "))}
            </span>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-label={s.editLabel(name)}
            onClick={onEdit}
          >
            {s.edit}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-label={t.removeLabel(name)}
            onClick={onRemove}
          >
            {t.remove}
          </Button>
        </div>
      )}
    </li>
  );
}
