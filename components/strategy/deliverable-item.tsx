"use client";

import {
  TitleScopeButton,
  type ScopedAction,
} from "@/components/projects/titles/title-scope";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { strategy } from "@/lib/i18n/fr/strategy";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { strategyDeliverables } from "@/lib/i18n/fr/strategy-deliverables";
import {
  titleScopeLabel,
  type ActionTitleScope,
  type ScopeTitle,
} from "@/lib/projects/title-scope-rules";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
import type { StrategyDeliverable } from "@/lib/strategy/queries";

const fr = { projectTitles, strategy, strategyDeliverables };

const dueFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** One committed deliverable, a row of its lever's `Rows`: its name and
 * number, who, when; « Modifier » (outlined), « Retirer » beside it. */
export function DeliverableItem({
  deliverable: d,
  assigneeName,
  milestones = [],
  selected,
  onToggle,
  canEdit,
  pending,
  titleScope = null,
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
  // A collective (lot 10): the titles it targets, and « Titres » to change
  // them.
  titleScope?: {
    action: ScopedAction;
    scope: ActionTitleScope;
    titles: ScopeTitle[];
  } | null;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = fr.strategy.deliverables;
  const s = fr.strategyDeliverables;
  const name = deliverableTitle(d.title, d.quantity);
  return (
    // A row of the lever's `Rows` (its frame and hairlines).
    <li className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-3">
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
          {titleScope && (
            <span className="text-caption text-muted-foreground">
              {fr.projectTitles.scope.label} ·{" "}
              {titleScopeLabel(titleScope.scope, titleScope.titles)}
            </span>
          )}
          {milestones.length > 0 && (
            <span className="text-caption text-muted-foreground">
              {s.milestones(milestones.join(", "))}
            </span>
          )}
        </div>
      </div>
      {canEdit && (
        // « Modifier » outlined, « Retirer » in text beside it.
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            aria-label={s.editLabel(name)}
            onClick={onEdit}
          >
            {s.edit}
          </Button>
          {titleScope && (
            <TitleScopeButton
              action={titleScope.action}
              scope={titleScope.scope}
              titles={titleScope.titles}
              disabled={pending}
            />
          )}
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
