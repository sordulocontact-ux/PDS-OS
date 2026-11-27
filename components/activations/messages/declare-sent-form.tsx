"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { advanceMessage } from "@/lib/activations/messages/actions";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations, activationWork };

const t = fr.activationWork.messages;

/** « Marquer l'envoi comme déclaré »: when, a proof, a note. */
export function DeclareSentForm({
  projectId,
  messageId,
  today,
  onDone,
}: {
  projectId: string;
  messageId: string;
  today: string;
  onDone: () => void;
}) {
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.declared);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const sentOn = String(data.get("sentOn") ?? "");
        setMissing(!sentOn);
        if (!sentOn) return;
        run(() =>
          advanceMessage({
            projectId,
            messageId,
            action: "declare_sent",
            comment: String(data.get("note") ?? ""),
            sentOn,
            proofUrl: String(data.get("proof") ?? "").trim(),
          }),
        );
      }}
    >
      <Field
        name="sentOn"
        type="date"
        label={t.sentOn}
        required
        max={today}
        defaultValue={today}
        error={missing ? fr.activations.errors.dateRequired : undefined}
      />
      <Field
        name="proof"
        type="url"
        label={t.proof}
        placeholder="https://"
        maxLength={2000}
      />
      <Field name="note" label={t.note} maxLength={1000} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.declare}
        </Button>
      </div>
    </form>
  );
}
