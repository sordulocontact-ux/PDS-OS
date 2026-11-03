"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import type { Unreviewed } from "@/lib/calls/closure";
import { closeCall } from "@/lib/calls/closure-actions";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * « Clôturer le call » (PROJ-AMEL-01): the report frozen as a dated
 * version, what is still to review said first; once closed, « Corriger le
 * compte rendu » makes the next version, the previous ones stay.
 */
export function CloseCallButton({
  callId,
  unreviewed,
  closed,
  size = "default",
}: {
  callId: string;
  unreviewed: Unreviewed;
  // Already closed once: the button corrects it.
  closed: boolean;
  size?: "sm" | "default";
}) {
  const t = fr.calls.closure;
  return (
    <DialogButton
      label={closed ? t.correct : t.close}
      variant={closed ? "outline" : "default"}
      size={size}
      title={t.closeTitle}
      description={t.closeBody}
    >
      {(close) => (
        <CloseForm callId={callId} unreviewed={unreviewed} onDone={close} />
      )}
    </DialogButton>
  );
}

function CloseForm({
  callId,
  unreviewed,
  onDone,
}: {
  callId: string;
  unreviewed: Unreviewed;
  onDone: () => void;
}) {
  const t = fr.calls.closure;
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const left = unreviewed.actions > 0 || unreviewed.proposals > 0;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await closeCall(callId, note);
          if (!result.ok) return setError(result.error);
          toast.success(t.closed);
          onDone();
        });
      }}
    >
      <FormMessage kind="info">
        {left
          ? t.unreviewed(unreviewed.actions, unreviewed.proposals)
          : t.allReviewed}
      </FormMessage>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <TextareaField
        name="note"
        label={t.noteLabel}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <DialogFormActions
        onCancel={onDone}
        submitLabel={t.close}
        pending={pending}
      />
    </form>
  );
}
