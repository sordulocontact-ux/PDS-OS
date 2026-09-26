"use client";

import { useActionState } from "react";

import { ConsentOptions } from "@/components/calls/consent-options";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateConsent } from "@/lib/calls/actions";
import type { Consent } from "@/lib/calls/constants";
import { fr } from "@/lib/i18n/fr";

/** Change the consent state. Locked once audio exists (DB constraint). */
export function ConsentForm({
  callId,
  consent,
  note,
  locked,
}: {
  callId: string;
  consent: Consent;
  note: string | null;
  locked: boolean;
}) {
  const t = fr.calls.consent;
  const [state, formAction, pending] = useActionState(updateConsent, null);
  const canEdit = useCanEditProject();

  // Read-only viewers see the recorded choice as text, not disabled radios.
  if (!canEdit) {
    return (
      <div className="grid gap-1 text-sm">
        <p className="font-medium">{t.label[consent]}</p>
        <p className="text-muted-foreground">{t.explain[consent]}</p>
        {note && <p className="whitespace-pre-wrap">{note}</p>}
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="callId" value={callId} />
      {/* Remount on change so the radios reflect the saved state. */}
      <ConsentOptions
        key={consent}
        defaultValue={consent}
        disabled={locked || pending}
        legend={t.title}
        hideLegend
      />
      {locked ? (
        <p className="text-sm text-muted-foreground">{t.locked}</p>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="consent-note">{t.note}</Label>
            <Textarea
              id="consent-note"
              name="note"
              maxLength={500}
              rows={2}
              defaultValue={note ?? ""}
              placeholder={t.notePlaceholder}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="outline"
              disabled={pending}
              className="h-10 px-4"
            >
              {pending ? t.pending : t.change}
            </Button>
            <p aria-live="polite" className="text-sm">
              {state?.ok && t.saved}
              {state && !state.ok && (
                <span className="text-destructive">
                  {fr.calls.errors[state.error]}
                </span>
              )}
            </p>
          </div>
        </>
      )}
    </form>
  );
}
