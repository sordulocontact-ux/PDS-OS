"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { setExportCheckResult } from "@/lib/production/delivery/checklist-actions";

const t = fr.productionDelivery;

/** « Non conforme »: what is wrong, required. */
export function NotOkForm({
  projectId,
  checkId,
  note,
  onDone,
}: {
  projectId: string;
  checkId: string;
  note: string | null;
  onDone: () => void;
}) {
  const [missing, setMissing] = useState<string>();
  const { pending, error, run } = useWriteSubmit(onDone, t.checklist.marked);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const value = String(new FormData(form).get("note") ?? "").trim();
    if (!value) {
      setMissing(t.errors.noteRequired);
      form.querySelector<HTMLTextAreaElement>("textarea")?.focus();
      return;
    }
    setMissing(undefined);
    run(() =>
      setExportCheckResult({
        projectId,
        checkId,
        result: "not_ok",
        note: value,
      }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <TextareaField
        name="note"
        label={t.checklist.notOk.note}
        required
        rows={3}
        maxLength={1000}
        defaultValue={note ?? ""}
        error={missing}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.checklist.notOk.confirm}
        onCancel={onDone}
      />
    </form>
  );
}
