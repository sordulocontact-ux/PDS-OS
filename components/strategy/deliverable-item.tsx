"use client";

import { optionClass } from "@/components/ui/option-class";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
import type { StrategyDeliverable } from "@/lib/strategy/queries";

const dueFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** One committed deliverable: its name and number, who, when; edit, remove. */
export function DeliverableItem({
  deliverable: d,
  assigneeName,
  canEdit,
  pending,
  onEdit,
  onRemove,
}: {
  deliverable: StrategyDeliverable;
  assigneeName: string | null;
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
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-semibold break-words">{name}</span>
        <span className="text-caption text-muted-foreground">
          {[
            d.assignee_person_id ? (assigneeName ?? "—") : t.noAssignee,
            d.due_date
              ? dueFormat.format(new Date(`${d.due_date}T00:00:00Z`))
              : t.noDueDate,
          ].join(" · ")}
        </span>
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
