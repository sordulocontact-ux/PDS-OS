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

/**
 * The side panel of a « Préparer un échange » (Stratégie, Conception,
 * Production): its button, then the title, one sentence and the form. The
 * form is mounted only while open: reopening starts afresh. `children`
 * receives the close callback (« Annuler »).
 */
export function PrepareCallSheet({
  label,
  title,
  body,
  variant = "outline",
  children,
}: {
  label: string;
  title: string;
  body: string;
  variant?: "default" | "outline";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="px-5 pt-5 pr-14">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{body}</SheetDescription>
          </SheetHeader>
          {open && (
            <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children(() => setOpen(false))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
