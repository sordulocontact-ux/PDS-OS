"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { confirmReady } from "@/lib/production/ready-actions";

const t = fr.productionReady;

/**
 * « Confirmer : préparation validée » (proto BODY.ready): when lines are
 * not ready, the callout, « Je confirme la préparation malgré … » and the
 * reason; the server computes the synthesis again before keeping it.
 */
export function ReadyConfirmForm({
  projectId,
  deliverableId,
  missing,
}: {
  projectId: string;
  deliverableId: string;
  // The labels of the lines not ready.
  missing: string[];
}) {
  const [forced, setForced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, error, run } = useWriteSubmit(() => undefined, t.confirm);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    ).trim();
    const next: Record<string, string> = {};
    if (missing.length > 0 && !forced) next.force = t.errors.force;
    if (missing.length > 0 && !reason) next.reason = t.errors.reason;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    run(() => confirmReady({ projectId, deliverableId, reason }));
  }
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {missing.length > 0 && (
        <>
          <ToneCallout tone="warning">{t.missing(missing.length)}</ToneCallout>
          <CheckboxField
            label={t.force(missing.map((m) => m.toLowerCase()).join(", "))}
            checked={forced}
            onChange={setForced}
          />
          {errors.force && (
            <FormMessage kind="error">{errors.force}</FormMessage>
          )}
          <TextareaField
            name="reason"
            label={t.reason}
            placeholder={t.reasonPlaceholder}
            required
            rows={2}
            maxLength={1000}
            error={errors.reason}
          />
        </>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.confirm}
        </Button>
      </div>
    </form>
  );
}
