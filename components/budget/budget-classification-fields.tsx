"use client";

import { OptionSelect } from "@/components/framing/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BUDGET_FAMILIES,
  suggestBudgetFamily,
  suggestBudgetLink,
  type BudgetDeliverable,
  type BudgetLever,
} from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";

export const NONE = "none";

export type Classification = {
  family: string;
  familyDetail: string;
  leverId: string;
  deliverableId: string;
};

/**
 * Where a spend goes (MKT-S1-11, MKT-S1-15): its family, said with a
 * definition and examples, suggested from the label with the word that
 * suggests it (never chosen silently); « Autre » asks what it is; the lever
 * and the deliverable it serves, the one the label names proposed.
 */
export function BudgetClassificationFields({
  label,
  value,
  onChange,
  levers,
  deliverables,
  detailError,
}: {
  // The label typed: what the suggestions read.
  label: string;
  value: Classification;
  onChange: (next: Classification) => void;
  levers: BudgetLever[];
  deliverables: BudgetDeliverable[];
  detailError: boolean;
}) {
  const t = fr.budget.form;
  const set = (patch: Partial<Classification>) =>
    onChange({ ...value, ...patch });
  const families = { [NONE]: t.none, ...fr.budget.families };
  const suggested = label.trim() ? suggestBudgetFamily(label) : null;
  const shownFamily = BUDGET_FAMILIES.find((f) => f === value.family);
  const offered = deliverables.filter(
    (d) => value.leverId === NONE || d.leverId === value.leverId,
  );
  const linked =
    value.deliverableId === NONE && label.trim()
      ? suggestBudgetLink(
          label,
          offered.map((d) => ({ ...d, label: d.title })),
        )
      : null;

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="budget-family">{t.family}</Label>
        <OptionSelect
          id="budget-family"
          label={t.family}
          options={families}
          value={value.family}
          onChange={(family) => set({ family })}
        />
        {shownFamily && (
          <p className="text-caption text-muted-foreground">
            {fr.budget.familyHints[shownFamily]}
          </p>
        )}
        {suggested && suggested.family !== value.family && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--text-secondary)]">
            {t.suggestion(fr.budget.families[suggested.family], suggested.word)}
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => set({ family: suggested.family })}
            >
              {t.useSuggestion}
            </Button>
          </p>
        )}
      </div>
      {value.family === "other" && (
        <div className="grid gap-1.5">
          <Label htmlFor="budget-family-detail" required>
            {t.familyDetail}
          </Label>
          <Input
            id="budget-family-detail"
            maxLength={120}
            value={value.familyDetail}
            aria-invalid={detailError || undefined}
            aria-describedby={
              detailError ? "budget-family-detail-error" : undefined
            }
            onChange={(event) => set({ familyDetail: event.target.value })}
          />
          {detailError && (
            <p
              id="budget-family-detail-error"
              className="text-caption text-error"
            >
              {t.familyDetailRequired}
            </p>
          )}
        </div>
      )}
      {levers.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="budget-lever">{t.lever}</Label>
          <OptionSelect
            id="budget-lever"
            label={t.lever}
            options={{
              [NONE]: t.none,
              ...Object.fromEntries(levers.map((l) => [l.id, l.label])),
            }}
            value={value.leverId}
            onChange={(leverId) => set({ leverId, deliverableId: NONE })}
          />
        </div>
      )}
      {offered.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="budget-deliverable">{t.deliverable}</Label>
          <OptionSelect
            id="budget-deliverable"
            label={t.deliverable}
            options={{
              [NONE]: t.none,
              ...Object.fromEntries(offered.map((d) => [d.id, d.title])),
            }}
            value={value.deliverableId}
            onChange={(deliverableId) => set({ deliverableId })}
          />
          {linked && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--text-secondary)]">
              {t.linkSuggestion(linked.title)}
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  set({
                    deliverableId: linked.id,
                    leverId: linked.leverId ?? undefined,
                  })
                }
              >
                {t.useSuggestion}
              </Button>
            </p>
          )}
        </div>
      )}
    </>
  );
}
