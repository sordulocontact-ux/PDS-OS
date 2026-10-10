"use client";

import { useState } from "react";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { submitDesignSheet } from "@/lib/design/actions/sheet-review";
import { fr } from "@/lib/i18n/fr";

/**
 * « Soumettre » a Fiche Livrable to its validators, confirmed first: the
 * sheet is frozen until they decide. Held while something blocks (« PO
 * signale »); the database checks the rest (responsible, validators,
 * nothing already waiting).
 */
export function SubmitSheetButton({
  projectId,
  sheetId,
  blocked,
}: {
  projectId: string;
  sheetId: string;
  blocked: boolean;
}) {
  const t = fr.conceptionSheet.review;
  const { pending, run } = useDesignAction();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        className="self-start"
        disabled={pending || blocked}
        aria-describedby={blocked ? "sheet-submit-blocked" : undefined}
        onClick={() => setOpen(true)}
      >
        {t.submit}
      </Button>
      {blocked && (
        <p
          id="sheet-submit-blocked"
          className="text-caption text-muted-foreground"
        >
          {t.blocked}
        </p>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.confirmTitle}
        description={t.confirmBody}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.submit}
        pendingLabel={t.submitting}
        pending={pending}
        onConfirm={() =>
          run(() => submitDesignSheet(projectId, sheetId), {
            success: t.submitted,
            onSuccess: () => setOpen(false),
          })
        }
      />
    </div>
  );
}
