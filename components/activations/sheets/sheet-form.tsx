"use client";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveSheet } from "@/lib/activations/sheet-actions";
import type { SheetFieldKey, SheetFields } from "@/lib/activations/sheets";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations, activationWork };

const t = fr.activationWork.sheet;

/**
 * The fields of a sheet, each with where its value comes from ; a value
 * changed here becomes « Saisi ici ». Saving a validated or submitted
 * version opens a new one (said above the form).
 */
export function SheetForm({
  projectId,
  activationId,
  kind,
  targetId,
  keys,
  values,
  notice,
}: {
  projectId: string;
  activationId: string;
  kind: "framing" | "concept";
  targetId: string | null;
  keys: readonly SheetFieldKey[];
  values: SheetFields;
  notice: string | null;
}) {
  const { pending, error, run } = useWriteSubmit(() => undefined, t.saved);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const fields = Object.fromEntries(
          keys.map((key) => {
            const value = String(data.get(key) ?? "");
            const before = values[key];
            const source =
              before && before.value === value ? before.source : "manual";
            return [key, { value, source }];
          }),
        );
        run(() =>
          saveSheet({ projectId, activationId, kind, targetId, fields }),
        );
      }}
    >
      {notice && <p className="text-body-sm text-muted-foreground">{notice}</p>}
      {keys.map((key) => {
        const source = values[key]?.source;
        return (
          <TextareaField
            key={key}
            name={key}
            label={t.fields[key]}
            rows={2}
            maxLength={4000}
            defaultValue={values[key]?.value ?? ""}
            hint={
              source && source !== "manual" ? `${t.source[source]}` : undefined
            }
          />
        );
      })}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
