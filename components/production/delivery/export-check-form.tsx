"use client";

import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { FilterChip } from "@/components/ui/filter-chip";
import { productionClosure } from "@/lib/i18n/fr/production-closure";
import { productionDelivery } from "@/lib/i18n/fr/production-delivery";
import { saveExportCheck } from "@/lib/production/delivery/checklist-actions";
import {
  EXPORT_CHECK_KINDS,
  type ExportCheckKind,
  type ExportCheckLine,
} from "@/lib/production/delivery/rules";
import { isHttpsLink } from "@/lib/production/rules";

const fr = { productionDelivery, productionClosure };

const t = fr.productionDelivery;

/** An expected file of the checklist: label, type, what is expected of it,
 * link. */
export function ExportCheckForm({
  projectId,
  sheetId,
  line,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  // Absent: a new line.
  line?: ExportCheckLine;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<ExportCheckKind>(line?.kind ?? "export");
  const [errors, setErrors] = useState<{ label?: string; url?: string }>({});
  const { pending, error, run } = useWriteSubmit(
    onDone,
    t.checklist.form.saved,
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const label = String(data.get("label") ?? "").trim();
    const url = String(data.get("url") ?? "").trim();
    const spec = String(data.get("spec") ?? "").trim();
    const next = {
      label: label ? undefined : t.errors.label,
      url: url === "" || isHttpsLink(url) ? undefined : t.errors.url,
    };
    setErrors(next);
    const first = next.label ? "label" : next.url ? "url" : null;
    if (first) {
      form.querySelector<HTMLInputElement>(`input[name=${first}]`)?.focus();
      return;
    }
    run(() =>
      saveExportCheck({
        projectId,
        sheetId,
        checkId: line?.id,
        label,
        kind,
        spec,
        url,
      }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <Field
        name="label"
        label={t.checklist.form.label}
        hint={t.checklist.form.labelHint}
        required
        maxLength={120}
        defaultValue={line?.label ?? ""}
        error={errors.label}
      />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">
          {t.checklist.form.kind}
        </legend>
        <div className="flex flex-wrap gap-2">
          {EXPORT_CHECK_KINDS.map((value) => (
            <FilterChip
              key={value}
              pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {t.checklist.kinds[value]}
            </FilterChip>
          ))}
        </div>
      </fieldset>
      <Field
        name="spec"
        label={fr.productionClosure.spec.label}
        hint={fr.productionClosure.spec.hint}
        maxLength={500}
        defaultValue={line?.spec ?? ""}
      />
      <Field
        name="url"
        label={t.checklist.form.url}
        hint={t.checklist.form.urlHint}
        type="url"
        inputMode="url"
        maxLength={2000}
        placeholder="https://"
        defaultValue={line?.url ?? ""}
        error={errors.url}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.checklist.form.save}
        onCancel={onDone}
      />
    </form>
  );
}
