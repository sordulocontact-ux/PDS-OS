"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fr } from "@/lib/i18n/fr";
import { setContractTemplateStatus } from "@/lib/legal/contracts/template-actions";

/** « Valider » a draft template, on its page (JUR-19): the director's
 * decision, asked first, the refusal kept in the dialog. */
export function TemplateValidateButton({ templateId }: { templateId: string }) {
  const t = fr.legalContracts.templates;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        {t.validate}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setError(null);
          setOpen(next);
        }}
        title={t.validateTitle}
        description={t.validateBody}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={t.validate}
        pendingLabel={t.validating}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await setContractTemplateStatus(
              templateId,
              "validated",
            );
            if (!result.ok) return setError(result.error);
            setOpen(false);
          })
        }
      />
    </>
  );
}
