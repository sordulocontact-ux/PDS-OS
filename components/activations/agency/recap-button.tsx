"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { prepareAgencyRecap } from "@/lib/activations/agency/report-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationAgency.recap;

/** « Préparer le retour à l'agence » : a draft written by code from the
 * decisions, to read, edit and validate. */
export function RecapButton({
  projectId,
  activationId,
}: {
  projectId: string;
  activationId: string;
}) {
  return (
    <ConfirmButton
      label={fr.activationWork.messages.add}
      variant="default"
      title={t.title}
      body={fr.activationWork.messages.addDescription}
      confirmLabel={fr.activationWork.messages.add}
      pendingLabel={fr.activations.saving}
      done={fr.activationWork.messages.saved}
      run={() => prepareAgencyRecap({ projectId, activationId })}
    />
  );
}
