"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import { startShoot } from "@/lib/production/shoot/shoot-actions";

const fr = { productionShoot };

const t = fr.productionShoot.launch;

/** « Lancer le tournage » (PROD-018), asked first; shown only on a sheet
 * ready for the shoot whose shoot has not started. */
export function LaunchShootButton({
  projectId,
  sheetId,
}: {
  projectId: string;
  sheetId: string;
}) {
  return (
    <ConfirmButton
      label={t.button}
      variant="default"
      size="lg"
      title={t.title}
      body={t.body}
      confirmLabel={t.button}
      pendingLabel={t.pending}
      done={t.done}
      run={() => startShoot({ projectId, sheetId })}
    />
  );
}
