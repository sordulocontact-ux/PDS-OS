"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";

import { ExportCheckForm } from "./export-check-form";

const t = fr.productionDelivery;

/** « Ajouter un fichier attendu » to the checklist. */
export function AddExportCheckButton({
  projectId,
  sheetId,
}: {
  projectId: string;
  sheetId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t.checklist.add}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.checklist.form.addTitle}
        description={t.checklist.form.description}
        closeLabel={t.close}
      >
        <ExportCheckForm
          projectId={projectId}
          sheetId={sheetId}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}
