"use client";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { advanceClearance } from "@/lib/legal/clearance/actions";

import { useLegalAction } from "@/components/legal/use-legal-action";

/** « Autre issue : Retirer l'élément du titre » — the borrowing abandoned,
 * with its reason said; it no longer blocks the release. */
export function WithdrawButton({
  projectId,
  clearanceId,
}: {
  projectId: string;
  clearanceId: string;
}) {
  const t = fr.legalClearance;
  const { pending, run } = useLegalAction();
  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
      <span className="text-sm text-muted-foreground">{t.stages.other}</span>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(() =>
            advanceClearance({
              projectId,
              clearanceId,
              status: "abandoned",
              note: t.flow.withdrawNote,
            }),
          )
        }
      >
        {t.flow.withdraw}
      </Button>
    </div>
  );
}
