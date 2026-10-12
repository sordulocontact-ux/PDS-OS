"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.dialogs;

/** A dialog's body that asks one written reason before acting (withdraw a
 * proof, invalidate a figure, resolve a blocker, reopen, refuse…).
 * `defaultValue`: a text already known, to correct rather than retype (the
 * listening notes of an audio version); `hint` says where it comes from. */
export function ReasonForm({
  label,
  submitLabel,
  doneMessage,
  required = true,
  defaultValue,
  hint,
  run,
  onDone,
}: {
  label: string;
  submitLabel: string;
  doneMessage: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  run: (reason: string) => Promise<WriteResult>;
  onDone: () => void;
}) {
  const [missing, setMissing] = useState(false);
  const { pending, error, run: submit } = useWriteSubmit(onDone, doneMessage);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
        setMissing(required && !reason);
        if (required && !reason) return;
        submit(() => run(reason));
      }}
    >
      <TextareaField
        name="reason"
        label={label}
        required={required}
        rows={defaultValue ? 6 : 3}
        maxLength={2000}
        defaultValue={defaultValue}
        hint={hint}
        error={missing ? t.reasonRequired : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.saving : submitLabel}
        </Button>
      </div>
    </form>
  );
}
