"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { fr } from "@/lib/i18n/fr";
import { closeProductionSheet } from "@/lib/production/delivery/handoff-actions";

const t = fr.productionClosure.closure;

/** « Clôturer la production », asked first; a refusal of the database
 * (something still open) stays in the dialog. */
export function CloseProductionButton({
  projectId,
  sheetId,
  title,
}: {
  projectId: string;
  sheetId: string;
  title: string;
}) {
  return (
    <ConfirmButton
      label={t.close}
      variant="default"
      title={t.confirmTitle}
      body={t.confirmBody(title)}
      confirmLabel={t.close}
      pendingLabel={t.pending}
      done={t.done}
      run={() => closeProductionSheet({ projectId, sheetId })}
    />
  );
}
