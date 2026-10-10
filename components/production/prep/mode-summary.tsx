"use client";

import { useState } from "react";

import { ModePicker } from "@/components/production/prep/mode-picker";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import type { ProductionMode } from "@/lib/production/sheet";

/** The organisation chosen for the sheet, and « Changer » for the owner. */
export function ModeSummary({
  projectId,
  deliverableId,
  mode,
  canChange,
}: {
  projectId: string;
  deliverableId: string;
  mode: ProductionMode;
  canChange: boolean;
}) {
  const t = fr.productionPrep;
  const [open, setOpen] = useState(false);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="text-muted-foreground">{t.modes.current}</span>
      <span className="font-medium">{t.modes.options[mode].label}</span>
      {canChange && (
        <>
          <Button size="xs" variant="ghost" onClick={() => setOpen(true)}>
            {t.modes.change}
          </Button>
          <FormDialog
            open={open}
            onOpenChange={setOpen}
            title={t.modes.changeTitle}
            description={t.modes.changeDescription}
            closeLabel={t.close}
          >
            <ModePicker
              projectId={projectId}
              deliverableId={deliverableId}
              current={mode}
              onDone={() => setOpen(false)}
            />
          </FormDialog>
        </>
      )}
    </p>
  );
}
