"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { attachProof } from "@/lib/finance/proof-gestures";
import type { ProofRow } from "@/lib/finance/proof-view";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";

const t = financeReceipts;

/**
 * The gesture on a proof's card or line (same as Rapprochement: the button
 * on the line): « Rattacher » to the spend the code proposes, « Vérifier »
 * when a value must be read again by a person (it opens the sheet).
 * Nothing otherwise. Above the card's own open button.
 */
export function ReceiptAction({
  row,
  onCheck,
}: {
  row: ProofRow;
  onCheck: () => void;
}) {
  const submit = useWriteSubmit(undefined, t.attached);
  const best = row.matches[0];
  if (row.state === "toCheck")
    return (
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="relative z-10"
        onClick={onCheck}
      >
        {t.actions.check}
      </Button>
    );
  if (row.state !== "proposed" || !best) return null;
  return (
    <Button
      type="button"
      size="xs"
      className="relative z-10"
      disabled={submit.pending}
      onClick={() =>
        submit.run(async () => {
          const result = await attachProof(row.proof.id, best.spend.id);
          if (!result.ok) toast.error(result.error);
          return result;
        })
      }
    >
      {t.actions.attach}
    </Button>
  );
}
