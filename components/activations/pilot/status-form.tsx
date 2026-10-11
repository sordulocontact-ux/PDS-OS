"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { setActivationStatus } from "@/lib/activations/actions";
import {
  REASONED_STATUSES,
  SETTABLE_STATUSES,
  type ActivationStatus,
} from "@/lib/activations/model";
import { fr } from "@/lib/i18n/fr";

const t = fr.activations;

/** « Changer le statut » : any open status, a reason for cancelled,
 * suspended or blocked ; « Réalisée déclarée » says what it does not mean. */
export function StatusForm({
  projectId,
  activationId,
  current,
  reason,
  onDone,
}: {
  projectId: string;
  activationId: string;
  current: ActivationStatus;
  reason: string | null;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<ActivationStatus>(current);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.status.saved);
  const reasoned = REASONED_STATUSES.includes(status);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const text = String(
          new FormData(event.currentTarget).get("reason") ?? "",
        ).trim();
        setMissing(reasoned && !text);
        if (reasoned && !text) return;
        run(() =>
          setActivationStatus({
            projectId,
            activationId,
            status,
            reason: text,
          }),
        );
      }}
    >
      <OptionSelect
        name="status"
        label={t.columns.status}
        required
        items={Object.fromEntries(
          SETTABLE_STATUSES.map((s) => [s, t.statuses[s]]),
        )}
        defaultValue={current}
        onValueChange={(v) => setStatus(v as ActivationStatus)}
      />
      {status === "done_declared" && (
        <ToneCallout tone="warning">{t.status.declaredWarning}</ToneCallout>
      )}
      {reasoned && (
        <TextareaField
          name="reason"
          label={t.status.reason}
          required
          hint={t.status.reasonHint}
          rows={2}
          maxLength={1000}
          defaultValue={reason ?? ""}
          error={missing ? t.errors.reasonRequired : undefined}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.saving : t.status.change}
        </Button>
      </div>
    </form>
  );
}
