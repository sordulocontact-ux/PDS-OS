"use client";

import { SourcedField } from "@/components/design/sheets/sourced-field";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SheetField, SheetProvenance } from "@/lib/design/sheet-fields";
import type { SetSheetValue, SheetFormValues } from "@/lib/design/sheet-form";
import { fr } from "@/lib/i18n/fr";

type DateKey = "shootDate" | "postStart" | "postDeadline" | "deliveryDate";
type TextKey = "notes" | "constraints" | "dependencies" | "productionNotes";

const DATES: Array<[DateKey, SheetField]> = [
  ["shootDate", "shoot_date"],
  ["postStart", "post_start"],
  ["postDeadline", "post_deadline"],
  ["deliveryDate", "delivery_date"],
];
const TEXTS: Array<[TextKey, SheetField]> = [
  ["notes", "notes"],
  ["constraints", "constraints"],
  ["dependencies", "dependencies"],
  ["productionNotes", "production_notes"],
];

/**
 * Key dates, the forecast budget (never an expense) and what is left to
 * Production: notes, constraints, dependencies, points to settle there.
 */
export function SheetPlanFields({
  values,
  provenance,
  set,
}: {
  values: SheetFormValues;
  provenance: SheetProvenance;
  set: SetSheetValue;
}) {
  const t = fr.conceptionSheet;
  const f = t.fields;
  return (
    <>
      <FormSection title={t.sections.dates}>
        <div className="grid gap-4 sm:grid-cols-2">
          {DATES.map(([key, field]) => (
            <SourcedField
              key={key}
              id={`sheet-${key}`}
              label={f[key]}
              source={provenance[field]?.source}
            >
              <Input
                id={`sheet-${key}`}
                type="date"
                value={values[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </SourcedField>
          ))}
        </div>
      </FormSection>

      <FormSection title={t.sections.budget}>
        <SourcedField
          id="sheet-budget"
          label={f.budget}
          source={provenance.budget?.source}
          hint={f.budgetHint}
        >
          <Input
            id="sheet-budget"
            inputMode="decimal"
            className="max-w-48"
            value={values.budget}
            aria-describedby="sheet-budget-hint"
            onChange={(e) => set("budget", e.target.value)}
          />
        </SourcedField>
        <ChoiceCards
          name="budgetState"
          legend={f.budgetState}
          columns={3}
          value={values.budgetState}
          onChange={(value) => set("budgetState", value)}
          choices={(["not_committed", "committed"] as const).map((value) => ({
            value,
            label: f.budgetStates[value],
          }))}
        />
      </FormSection>

      <FormSection title={t.sections.production}>
        {TEXTS.map(([key, field]) => (
          <SourcedField
            key={key}
            id={`sheet-${key}`}
            label={f[key]}
            source={provenance[field]?.source}
            hint={key === "productionNotes" ? f.productionNotesHint : undefined}
          >
            <Textarea
              id={`sheet-${key}`}
              rows={3}
              maxLength={
                key === "notes" || key === "productionNotes" ? 4000 : 2000
              }
              value={values[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          </SourcedField>
        ))}
      </FormSection>
    </>
  );
}
