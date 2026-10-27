"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { SheetFieldEditor } from "@/components/design/sheets-step/sheet-field-editor";
import { Button } from "@/components/ui/button";
import { FactRowFrame } from "@/components/ui/fact-row-frame";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveSheetField } from "@/lib/design/actions/sheet-step";
import { fieldText, type SheetFieldView } from "@/lib/design/sheet-model";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { designSteps };

const t = fr.designSteps.sheets;

/**
 * One field of a Fiche Livrable (proto fieldRow): « Libellé * », the value
 * in bold and its source in full words — or « À renseigner » in red,
 * « Non renseigné » — and « Modifier » for the sheet's responsible: the
 * field's editor in place, « Proposé : … · source », the code's refusal.
 */
export function SheetFieldRow({
  projectId,
  sheetId,
  field: f,
  editable,
}: {
  projectId: string;
  sheetId: string;
  field: SheetFieldView;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(f.value);
  const { pending, error, setError, run } = useWriteSubmit(
    () => setEditing(false),
    t.saved,
  );
  const id = `sf-${sheetId}-${f.key}`;
  const label = f.required ? `${f.label} *` : f.label;
  if (editing)
    return (
      <FactRowFrame
        label={label}
        value={
          <span
            className="flex flex-col gap-1.5 pt-0.5"
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
              if (e.key === "Enter" && f.type !== "long") {
                e.preventDefault();
                run(() =>
                  saveSheetField({
                    projectId,
                    sheetId,
                    key: f.key,
                    value: draft,
                  }),
                );
              }
            }}
          >
            <span id={`${id}-label`} className="sr-only">
              {f.label}
            </span>
            <SheetFieldEditor
              id={id}
              type={f.type}
              value={draft}
              onChange={setDraft}
              invalid={Boolean(error)}
            />
            <FieldError id={`${id}-error`}>{error ?? undefined}</FieldError>
          </span>
        }
        sourceNode={
          f.proposal ? (
            <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
              {t.proposed(
                fieldText(f.type, f.proposal.value) ?? "—",
                f.proposal.source,
              )}
            </span>
          ) : null
        }
        side={
          <>
            <Button
              size="sm"
              disabled={pending}
              aria-busy={pending}
              onClick={() =>
                run(() =>
                  saveSheetField({
                    projectId,
                    sheetId,
                    key: f.key,
                    value: draft,
                  }),
                )
              }
            >
              {t.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t.cancel}
            </Button>
          </>
        }
      />
    );
  return (
    <FactRowFrame
      label={label}
      value={
        f.text ? (
          <b className="font-semibold">{f.text}</b>
        ) : f.required ? (
          <span className="font-semibold text-error">{t.toFill}</span>
        ) : (
          <span className="text-[color:var(--text-tertiary)]">
            {t.notFilled}
          </span>
        )
      }
      source={f.source}
      side={
        editable ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setError(null);
              setDraft(f.value);
              setEditing(true);
            }}
          >
            {t.edit}
          </Button>
        ) : undefined
      }
    />
  );
}
