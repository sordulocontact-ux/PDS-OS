"use client";

import { useState, type ReactNode } from "react";

import { FactRowFrame, type FactRowProps } from "@/components/ui/fact-row-frame";

/**
 * A fact whose whole row opens a modal on the page (docs/VISION-UX.md rule
 * 2, Sacha 05/11/2026: « quand on clique sur quelque chose, on puisse la
 * modifier directement », « ne presque jamais quitter la page »): its form
 * when the viewer may write (rights, a credit, shares, a declaration), else
 * a preview of the record (`RecordPeekDialog`). As in the Master, nothing
 * is written on the right: the row itself is the button (the hover says
 * so); `actionLabel` (« Modifier », « Voir ») is read by a screen reader
 * only, before `hrefLabel` or the label. One field only: `FactRow edit`.
 */
export function FactRowDialog({
  actionLabel,
  dialog,
  ...row
}: Omit<FactRowProps, "href" | "onClick"> & {
  actionLabel: string;
  dialog: (open: boolean, onOpenChange: (open: boolean) => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FactRowFrame
        {...row}
        hrefLabel={[actionLabel, row.hrefLabel ?? row.label]
          .filter(Boolean)
          .join(" · ")}
        onClick={() => setOpen(true)}
      />
      {dialog(open, setOpen)}
    </>
  );
}
