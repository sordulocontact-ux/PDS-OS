"use client";

import { toast } from "@/components/ui/toast";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { cancelFramingCall } from "@/lib/framing/actions/cancel-call";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingJourney };

/**
 * « Annuler l'échange », next to « Enregistrer l'échange » while the
 * framing exchange is only planned: asked first, then the Cadrage goes back
 * to its two ways in.
 */
export function CancelExchangeButton({
  projectId,
  callId,
  when,
}: {
  projectId: string;
  callId: string;
  when: string;
}) {
  const t = fr.framingJourney.start.cancel;
  return (
    <ConfirmButton
      size="lg"
      label={t.label}
      title={t.title}
      body={t.body(when)}
      confirmLabel={t.label}
      cancelLabel={t.keep}
      pendingLabel={t.pending}
      done={t.done}
      run={async () => {
        const result = await cancelFramingCall(projectId, callId);
        if (result.ok && result.notice) toast.warning(result.notice);
        return result;
      }}
    />
  );
}
