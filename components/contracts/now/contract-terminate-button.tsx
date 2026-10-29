"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { advanceContract } from "@/lib/contracts/actions";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/** « Résilier » a signed contract, confirmed first: it stays readable but
 * is frozen (advance_contract 'terminate'). */
export function ContractTerminateButton({
  contractId,
}: {
  contractId: string;
}) {
  const t = fr.contracts.now;
  const [open, setOpen] = useState(false);
  const submit = useWriteSubmit(() => setOpen(false), t.done.terminate);
  return (
    <>
      <div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          {t.terminate}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => !submit.pending && setOpen(next)}
        title={t.confirmTerminateTitle}
        description={t.confirmTerminateBody}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.terminate}
        pendingLabel={t.terminate}
        pending={submit.pending}
        error={submit.error}
        destructive
        onConfirm={() =>
          submit.run(() => advanceContract({ contractId, action: "terminate" }))
        }
      />
    </>
  );
}
