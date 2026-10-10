"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fr } from "@/lib/i18n/fr";
import { reopenDelivery } from "@/lib/release/delivery-actions";

/** « Rouvrir la livraison », confirmed (a file replaced, a delivery
 * cancelled at the distributor's). */
export function ReopenDeliveryButton({
  projectId,
  releaseId,
}: {
  projectId: string;
  releaseId: string;
}) {
  const t = fr.releaseDelivery;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {t.reopen}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setError(null);
          setOpen(next);
        }}
        title={t.reopenTitle}
        description={t.reopenBody}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.reopen}
        pendingLabel={t.reopening}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await reopenDelivery(projectId, releaseId);
            if (result.ok) setOpen(false);
            else setError(result.error);
          })
        }
      />
    </>
  );
}
