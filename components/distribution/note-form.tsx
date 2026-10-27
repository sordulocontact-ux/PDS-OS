"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { DistributionResult } from "@/lib/distribution/result";
import { distribution } from "@/lib/i18n/fr/distribution";

const fr = { distribution };

/**
 * A required note, then the action that needs it, in a dialog: refusing a
 * version or a closure, withdrawing a declaration, preparing a new
 * version, reopening. The note is checked before the action runs.
 */
export function NoteForm({
  label,
  submitLabel,
  done,
  onDone,
  send,
}: {
  label: string;
  submitLabel: string;
  // The toast once it succeeded.
  done: string;
  onDone: () => void;
  send: (note: string) => Promise<DistributionResult>;
}) {
  const [noteError, setNoteError] = useState<string>();
  const { pending, error, run } = useWriteSubmit(onDone, done);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    if (!note.trim()) {
      setNoteError(fr.distribution.noteRequired);
      return;
    }
    setNoteError(undefined);
    run(() => send(note));
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <TextareaField
        name="note"
        label={label}
        rows={3}
        maxLength={1000}
        required
        error={noteError}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={submitLabel}
        onCancel={onDone}
      />
    </form>
  );
}
