"use client";

import { useState } from "react";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { handoffDesignSheet } from "@/lib/design/actions/sheet-review";
import { fr } from "@/lib/i18n/fr";

/**
 * « Transférer à Production » (chef de projet): the latest validated
 * version, after saying what Production receives — and that nothing is
 * reserved, no team nor task created. `refresh`: a newer version replaces
 * one already handed over.
 */
export function HandoffButton({
  projectId,
  sheetId,
  version,
  refresh = false,
}: {
  projectId: string;
  sheetId: string;
  version: number;
  refresh?: boolean;
}) {
  const t = fr.conceptionSheet.handoff;
  const [open, setOpen] = useState(false);
  const { pending, run } = useDesignAction();
  return (
    <>
      <Button
        size="lg"
        variant={refresh ? "outline" : "default"}
        className="self-start"
        onClick={() => setOpen(true)}
      >
        {refresh ? t.refresh : t.open}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.body(version)}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.confirm}
        pendingLabel={t.pending}
        pending={pending}
        onConfirm={() =>
          run(() => handoffDesignSheet(projectId, sheetId), {
            success: t.done,
            onSuccess: () => setOpen(false),
          })
        }
      />
    </>
  );
}
