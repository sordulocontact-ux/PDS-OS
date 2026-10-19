"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

// Heavy and rarely opened: loaded on the first click.
const ReportDialog = dynamic(() => import("./report-dialog"));

/** « Voir le rapport » on a version card: opens the frozen report. */
export function ReportDialogButton(
  props: Omit<
    React.ComponentProps<typeof ReportDialog>,
    "open" | "onOpenChange"
  >,
) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {fr.reviewJourney.bilan.view}
      </Button>
      {open && <ReportDialog {...props} open={open} onOpenChange={setOpen} />}
    </div>
  );
}
