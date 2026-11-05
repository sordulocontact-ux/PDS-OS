"use client";

import { useState, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FactRowFrame, type FactRowProps } from "@/components/ui/fact-row-frame";

/**
 * A fact whose whole row opens its form in a modal on the page (docs/
 * VISION-UX.md rule 2, Sacha 05/11/2026: « quand on clique sur quelque
 * chose, on puisse la modifier directement »), for a value that takes more
 * than one field (rights, a credit, a declaration, shares). One field only:
 * `FactRow edit` instead, in place. `actionLabel` (« Modifier »,
 * « Compléter ») says on the right that the row opens; `dialog` renders the
 * module's modal, open or not; `hrefLabel` names the row for a screen
 * reader when its label is not the thing edited.
 */
export function FactRowDialog({
  actionLabel,
  dialog,
  side,
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
        // Read first by a screen reader: what the click does, on what.
        hrefLabel={[actionLabel, row.hrefLabel ?? row.label].filter(Boolean).join(" · ")}
        onClick={() => setOpen(true)}
        side={
          <>
            {side}
            {/* Part of the row's button, never a button of its own. */}
            <span
              aria-hidden
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {actionLabel}
            </span>
          </>
        }
      />
      {dialog(open, setOpen)}
    </>
  );
}
