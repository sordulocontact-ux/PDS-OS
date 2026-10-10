"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { SheetCreativeFields } from "@/components/design/sheets/sheet-creative-fields";
import { SheetFormatFields } from "@/components/design/sheets/sheet-format-fields";
import { SheetPlanFields } from "@/components/design/sheets/sheet-plan-fields";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { updateDesignSheet } from "@/lib/design/actions/sheets";
import type { SheetField, SheetProvenance } from "@/lib/design/sheet-fields";
import type { SetSheetValue, SheetFormValues } from "@/lib/design/sheet-form";
import { fr } from "@/lib/i18n/fr";

/**
 * The Fiche Livrable as its responsible (or the chef de projet) completes
 * it. One « Enregistrer » for the whole sheet: each value changed takes the
 * person's provenance, or « suggestion de PO acceptée » when it came from
 * one. The database refuses while a version waits for its decision.
 */
export function SheetForm({
  projectId,
  sheetId,
  initial,
  provenance,
}: {
  projectId: string;
  sheetId: string;
  initial: SheetFormValues;
  provenance: SheetProvenance;
}) {
  const t = fr.conceptionSheet;
  const [values, setValues] = useState(initial);
  const [suggested, setSuggested] = useState<SheetField[]>([]);
  const { pending, run } = useDesignAction();
  const set: SetSheetValue = (key, value) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    run(() => updateDesignSheet(projectId, sheetId, values, suggested), {
      success: t.saved,
      onSuccess: () => setSuggested([]),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Field
        name="title"
        label={t.fields.title}
        required
        maxLength={200}
        value={values.title}
        onChange={(e) => set("title", e.target.value)}
      />
      <SheetCreativeFields
        projectId={projectId}
        sheetId={sheetId}
        values={values}
        provenance={provenance}
        onChange={(field, value, fromSuggestion) => {
          set(field, value);
          setSuggested((list) =>
            fromSuggestion
              ? [...new Set([...list, field])]
              : list.filter((f) => f !== field),
          );
        }}
      />
      <SheetFormatFields values={values} provenance={provenance} set={set} />
      <SheetPlanFields values={values} provenance={provenance} set={set} />
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
