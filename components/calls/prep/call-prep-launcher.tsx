"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { callPrep } from "@/lib/i18n/fr/call-prep";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { callPrep, dialogs };

/**
 * « Préparer un échange » until the module's step holds the form itself:
 * the button, then the common form (`children`, a `CallPrepForm`) right
 * below it (`inline`, in a card), or in the modal where the button sits
 * in a toolbar (`dialog`). Mounted only while open: reopening starts
 * from what the module proposes.
 */
export function CallPrepLauncher({
  label,
  title,
  body,
  mode = "inline",
  variant = "outline",
  children,
}: {
  label: string;
  title: string;
  body?: string;
  mode?: "inline" | "dialog";
  variant?: "default" | "outline";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const button = (
    <Button
      size="lg"
      variant={variant}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
    >
      {label}
    </Button>
  );
  if (mode === "inline")
    return open ? (
      <div className="flex w-full basis-full flex-col gap-4 border-t border-[var(--border-hairline)] pt-5">
        {children}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setOpen(false)}
        >
          {fr.callPrep.cancel}
        </Button>
      </div>
    ) : (
      button
    );
  return (
    <>
      {button}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          size="medium"
          closeLabel={fr.dialogs.close}
          className="sm:max-w-[var(--dialog-width-medium)]"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {body && <DialogDescription>{body}</DialogDescription>}
          </DialogHeader>
          {open && children}
        </DialogContent>
      </Dialog>
    </>
  );
}
