"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { withdrawClearance } from "@/lib/legal/clearance/actions";

const fr = { legalClearance };

/** « Autre issue : Retirer l'élément du titre » — the borrowing abandoned
 * with its reason; it no longer blocks the release and whoever answers for
 * the project is told (the Master redoes the passage). Outlined: a way out
 * that changes the title is never a loose word (Sacha, 07/11/2026). */
export function WithdrawButton({
  projectId,
  clearanceId,
}: {
  projectId: string;
  clearanceId: string;
}) {
  const t = fr.legalClearance;
  return (
    <DialogButton
      label={t.flow.withdraw}
      variant="outline"
      size="xs"
      title={t.flow.withdraw}
      description={t.stages.negotiate.decide.withdrawBody}
    >
      {(close) => (
        <ReasonForm
          label={t.stages.negotiate.decide.withdrawWhy}
          submitLabel={t.flow.withdraw}
          doneMessage={t.stages.negotiate.decide.withdrawDone}
          run={(text) => withdrawClearance({ projectId, clearanceId, text })}
          onDone={() => {
            close();
          }}
        />
      )}
    </DialogButton>
  );
}
