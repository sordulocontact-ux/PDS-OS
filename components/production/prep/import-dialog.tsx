"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { ImportPasteForm } from "@/components/production/prep/import-paste-form";
import { ImportReview } from "@/components/production/prep/import-review";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import type { ProductionBrief } from "@/lib/production/brief";
import { proposeProductionImport } from "@/lib/production/import";
import type { ProductionImportProposals } from "@/lib/production/import-proposal";

/**
 * « Importer une organisation existante » for one production sheet: the
 * owner pastes a note, a mail or an old brief, PO proposes values for the
 * director's brief and human needs (each on a quote checked by code), the
 * owner keeps what they want and applies. The text is never stored.
 */
export function ProductionImportButton({
  projectId,
  sheetId,
  brief,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  brief: ProductionBrief;
  canOrganize: boolean;
}) {
  const t = fr.productionImport;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [proposals, setProposals] = useState<ProductionImportProposals | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!canOrganize) return null;

  const reset = () => {
    setText("");
    setProposals(null);
    setError(null);
  };
  const close = () => {
    setOpen(false);
    reset();
  };
  const propose = () => {
    setError(null);
    startTransition(async () => {
      const result = await proposeProductionImport({
        projectId,
        sheetId,
        text,
      });
      if (!result.ok) return setError(result.error);
      setProposals(result.proposals);
    });
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <IconFile aria-hidden />
        {t.open}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        title={t.dialogTitle}
        description={t.dialogDescription}
        closeLabel={t.close}
        size="wide"
      >
        {proposals ? (
          <ImportReview
            projectId={projectId}
            sheetId={sheetId}
            brief={brief}
            proposals={proposals}
            onBack={() => setProposals(null)}
            onDone={close}
          />
        ) : (
          <ImportPasteForm
            text={text}
            onTextChange={setText}
            pending={pending}
            error={error}
            onSubmit={propose}
            onCancel={close}
          />
        )}
      </FormDialog>
    </>
  );
}
