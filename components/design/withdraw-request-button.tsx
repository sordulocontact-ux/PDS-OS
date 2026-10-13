"use client";

import { useState } from "react";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { withdrawDesignSubmission } from "@/lib/design/actions/direction";
import { fr } from "@/lib/i18n/fr";

/** « Retirer la demande » (MKT-C2-11): kept in history, then sent again. */
export function WithdrawRequestButton({
  projectId,
  submissionId,
}: {
  projectId: string;
  submissionId: string;
}) {
  const t = fr.conceptionRequests;
  const [open, setOpen] = useState(false);
  const { pending, run } = useDesignAction();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t.withdraw}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.withdrawTitle}
        description={t.withdrawBody}
        cancelLabel={t.cancel}
        closeLabel={t.cancel}
        confirmLabel={t.withdraw}
        pendingLabel={t.withdraw}
        pending={pending}
        onConfirm={() =>
          run(() => withdrawDesignSubmission(projectId, submissionId), {
            success: t.withdrawn,
            onSuccess: () => setOpen(false),
          })
        }
      />
    </>
  );
}
