"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { callPrep } from "@/lib/i18n/fr/call-prep";

const fr = { callPrep };

/**
 * « Préparer un échange » until the module's step holds the form itself:
 * the button, then the common form (`children`, a `CallPrepForm`) right
 * below it (`inline`, in a card), or in the side panel where the button
 * sits in a toolbar (`sheet`). Mounted only while open: reopening starts
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
  mode?: "inline" | "sheet";
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
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          <SheetHeader className="px-5 pt-5 pr-14">
            <SheetTitle>{title}</SheetTitle>
            {body && <SheetDescription>{body}</SheetDescription>}
          </SheetHeader>
          {open && (
            <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
