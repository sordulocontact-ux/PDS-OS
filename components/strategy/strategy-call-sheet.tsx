"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fr } from "@/lib/i18n/fr";
import type { StrategyCallSheetData } from "@/lib/strategy/call-prep";

import { StrategyCallForm } from "./strategy-call-form";

/**
 * « Préparer un échange » of the Stratégie as a side panel: what PO prepared
 * from what the strategy lacks, adjusted, then checked on a summary before
 * the call is created. Mounted only while open: reopening starts afresh.
 */
export function StrategyCallSheet({
  projectId,
  data,
  variant = "outline",
}: {
  projectId: string;
  data: StrategyCallSheetData;
  variant?: "default" | "outline";
}) {
  const t = fr.strategyEntry.call;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" variant={variant} onClick={() => setOpen(true)}>
        {fr.strategyEntry.prepare}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="px-5 pt-5 pr-14">
            <SheetTitle>{t.title}</SheetTitle>
            <SheetDescription>{t.body}</SheetDescription>
          </SheetHeader>
          {open && (
            <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <StrategyCallForm
                projectId={projectId}
                data={data}
                onCancel={() => setOpen(false)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
