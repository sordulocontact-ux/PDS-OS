"use client";

import { useRouter } from "next/navigation";

import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { fr } from "@/lib/i18n/fr";
import { withdrawClearance } from "@/lib/legal/clearance/actions";

/** « Autre issue : Retirer l'élément du titre » — the borrowing abandoned
 * with its reason; it no longer blocks the release and whoever answers for
 * the project is told (the Master redoes the passage). */
export function WithdrawButton({
  projectId,
  clearanceId,
}: {
  projectId: string;
  clearanceId: string;
}) {
  const t = fr.legalClearance;
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      <span className="text-sm text-muted-foreground">{t.stages.other}</span>
      <DialogButton
        label={t.flow.withdraw}
        variant="ghost"
        title={t.flow.withdraw}
        description={t.flow.decide.withdrawBody}
      >
        {(close) => (
          <ReasonForm
            label={t.flow.decide.withdrawWhy}
            submitLabel={t.flow.withdraw}
            doneMessage={t.flow.decide.withdrawDone}
            run={(text) => withdrawClearance({ projectId, clearanceId, text })}
            onDone={() => {
              close();
              router.refresh();
            }}
          />
        )}
      </DialogButton>
    </div>
  );
}
