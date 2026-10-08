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
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { isClosed } from "@/lib/legal/clearance/matrix";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { clearanceTone } from "@/lib/ui/state-tones";

import { ClearanceStages } from "./clearance-stages";
import { ExchangesTab } from "./exchanges-tab";
import { HistoryTab } from "./history-tab";
import { WithdrawButton } from "./withdraw-button";

/**
 * The drawer of a borrowing (the ticket's « drawer validé »), in three
 * moments — Demander, Négocier, Signer — the current one open with the one
 * action that ends it, as in the prototype of 07/10/2026. The exchanges and
 * the history fold under it; the one other way out: withdraw the element
 * from the title (a refusal is recorded from their answer).
 */
export function ClearanceDrawer({
  projectId,
  clearance,
  context,
  triggerLabel,
  primary = false,
  defaultOpen = false,
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
  // The button that opens it (« Ouvrir » on the list, the action's verb in
  // the plan); in ink when it is the line's next action.
  triggerLabel?: string;
  primary?: boolean;
  // Opened on arrival: a notification led here (`?emprunt=`).
  defaultOpen?: boolean;
}) {
  const t = fr.legalClearance;
  const [open, setOpen] = useState(defaultOpen);
  const closed = isClosed(clearance.status);

  return (
    <>
      <Button
        size="xs"
        variant={primary ? "default" : "outline"}
        onClick={() => setOpen(true)}
      >
        {triggerLabel ?? t.page.open}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
          <SheetHeader className="gap-2 px-5 pt-5 pr-14">
            <SheetTitle>« {clearance.work} »</SheetTitle>
            <SheetDescription>
              {[
                fr.legal.intake.facts.elements[
                  clearance.element as keyof typeof fr.legal.intake.facts.elements
                ],
                clearance.author,
                clearance.title,
                clearance.responsibleName
                  ? t.page.responsible(clearance.responsibleName)
                  : null,
                closed ? null : t.page.blocksRelease,
              ]
                .filter(Boolean)
                .join(" · ")}
            </SheetDescription>
            <StatusBadge
              tone={clearanceTone[clearance.status]}
              className="self-start"
            >
              {t.statuses[clearance.status]}
            </StatusBadge>
          </SheetHeader>
          <div className="flex flex-col gap-8 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <ClearanceBody
              projectId={projectId}
              clearance={clearance}
              context={context}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** What the borrowing's panel holds, on the Emprunts page and in the plan:
 * its outcome once closed, the three moments, the folded journal, the one
 * other way out. */
export function ClearanceBody({
  projectId,
  clearance,
  context,
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
}) {
  const t = fr.legalClearance;
  const closed = isClosed(clearance.status);
  return (
    <>
      {closed && (
        <ToneCallout
          tone={clearance.status === "cleared" ? "success" : "neutral"}
        >
          {clearance.status === "cleared"
            ? t.stages.done.cleared
            : t.stages.done.abandoned}
        </ToneCallout>
      )}
      <ClearanceStages
        projectId={projectId}
        clearance={clearance}
        context={context}
      />
      <details className="group flex flex-col gap-4 border-t pt-4">
        <summary className="cursor-pointer list-none text-sm text-muted-foreground marker:hidden">
          {t.stages.journal} ·{" "}
          {clearance.exchanges.length + clearance.history.length}
        </summary>
        <div className="flex flex-col gap-6 pt-4">
          <ExchangesTab clearance={clearance} />
          <HistoryTab clearance={clearance} />
        </div>
      </details>
      {!closed && (
        <WithdrawButton projectId={projectId} clearanceId={clearance.id} />
      )}
    </>
  );
}
