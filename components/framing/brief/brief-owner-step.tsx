"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { sendBriefVersion } from "@/lib/framing/actions/brief-step";
import { briefRequests } from "@/lib/i18n/fr/brief-requests";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, briefRequests, framingJourney };

/**
 * The owner's gesture on the Brief, in the step: « Envoyer en validation à
 * X », which makes the version from the Cadrage shown above and sends it
 * at once (Sacha 28/10/2026: no « Créer le Brief » before it). A version
 * that says what the last one sent said goes only with a written reason
 * (PROJ-BUG-05).
 */
export function BriefOwnerStep({
  projectId,
  validatorName,
  unchangedFrom,
}: {
  projectId: string;
  validatorName: string;
  unchangedFrom: number | null;
}) {
  const tu = fr.briefRequests.unchanged;
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setReason(""),
    fr.framingJourney.done.briefSent,
  );
  const needsReason = unchangedFrom !== null;
  const missing = tried && needsReason && !reason.trim();
  return (
    <div className="flex flex-col gap-3">
      {needsReason && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {tu.warning(unchangedFrom ?? 0)}
        </p>
      )}
      {needsReason && (
        <TextareaField
          id="brief-unchanged-reason"
          name="reason"
          label={tu.reasonLabel}
          rows={2}
          maxLength={1000}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={
            missing ? fr.framingIntel.answerStates.reasonRequired : undefined
          }
        />
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            setTried(true);
            if (needsReason && !reason.trim()) {
              document.getElementById("brief-unchanged-reason")?.focus();
              return;
            }
            run(() => sendBriefVersion(projectId, reason));
          }}
        >
          {pending
            ? fr.framingJourney.brief.sending
            : fr.framingJourney.brief.sendTo(validatorName)}
        </Button>
      </div>
    </div>
  );
}
