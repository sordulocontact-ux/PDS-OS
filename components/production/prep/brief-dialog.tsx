"use client";

import { useState } from "react";

import { BriefForm } from "@/components/production/prep/brief-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import type { ProductionBrief } from "@/lib/production/brief";

/** « Compléter le brief » (nothing written yet) or « Modifier », opening the
 * whole brief in the wide modal. */
export function BriefDialog({
  projectId,
  sheetId,
  brief,
  started,
}: {
  projectId: string;
  sheetId: string;
  brief: ProductionBrief;
  // The brief was saved at least once.
  started: boolean;
}) {
  const t = fr.productionBrief;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant={started ? "outline" : "default"}
        onClick={() => setOpen(true)}
      >
        {started ? t.edit : t.fill}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialog.title}
        description={t.dialog.description}
        closeLabel={t.close}
        size="wide"
      >
        <BriefForm
          projectId={projectId}
          sheetId={sheetId}
          brief={brief}
          onDone={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}
