"use client";

import { useState, useTransition } from "react";

import { SourcedField } from "@/components/design/sheets/sourced-field";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { Textarea } from "@/components/ui/textarea";
import { suggestSheetWording } from "@/lib/design/actions/sheet-suggest";
import type { SheetProvenance } from "@/lib/design/sheet-fields";
import type { SheetFormValues } from "@/lib/design/sheet-form";
import { fr } from "@/lib/i18n/fr";

type TextField = "concept" | "intention";

/**
 * Concept and intention of the sheet. « Proposer une formulation » asks PO
 * for a wording drawn from the confirmed intentions: shown apart, used or
 * ignored by the person, saved only with the sheet (then marked as an
 * accepted suggestion).
 */
export function SheetCreativeFields({
  projectId,
  sheetId,
  values,
  provenance,
  onChange,
}: {
  projectId: string;
  sheetId: string;
  values: Pick<SheetFormValues, TextField>;
  provenance: SheetProvenance;
  onChange: (field: TextField, value: string, fromSuggestion: boolean) => void;
}) {
  const t = fr.conceptionSheet;
  return (
    <FormSection title={t.sections.creative}>
      {(["concept", "intention"] as const).map((field) => (
        <SourcedField
          key={field}
          id={`sheet-${field}`}
          label={t.fields[field]}
          source={provenance[field]?.source}
        >
          <Textarea
            id={`sheet-${field}`}
            rows={4}
            maxLength={4000}
            value={values[field]}
            onChange={(e) => onChange(field, e.target.value, false)}
          />
          <Suggestion
            projectId={projectId}
            sheetId={sheetId}
            field={field}
            onUse={(text) => onChange(field, text, true)}
          />
        </SourcedField>
      ))}
    </FormSection>
  );
}

function Suggestion({
  projectId,
  sheetId,
  field,
  onUse,
}: {
  projectId: string;
  sheetId: string;
  field: TextField;
  onUse: (text: string) => void;
}) {
  const t = fr.conceptionSheet.suggest;
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ask = () =>
    startTransition(async () => {
      setError(null);
      const result = await suggestSheetWording(projectId, sheetId, field);
      if (result.ok) setText(result.text);
      else setError(result.error);
    });

  if (text)
    return (
      <div
        role="status"
        className="flex flex-col gap-2 rounded-xl border border-dashed border-[color:var(--tone-info-fg)] bg-[var(--tone-info-bg)] p-3"
      >
        <p className="text-caption font-medium text-[color:var(--tone-info-fg)]">
          {t.title}
        </p>
        <p className="text-body-md whitespace-pre-line">{text}</p>
        <p className="text-caption text-muted-foreground">{t.hint}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onUse(text);
              setText(null);
            }}
          >
            {t.use}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setText(null)}
          >
            {t.dismiss}
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={ask}
      >
        {pending ? t.loading : t.open}
      </Button>
      {error && (
        <p role="alert" className="text-caption text-muted-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
