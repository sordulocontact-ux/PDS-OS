"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { legal } from "@/lib/i18n/fr/legal";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { isClosed } from "@/lib/legal/clearance/matrix";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { clearanceTone } from "@/lib/ui/state-tones";

import { ClearanceRequest } from "./clearance-request";
import { ClearanceStages, isAskMoment } from "./clearance-stages";
import { ClearanceExchanges } from "./clearance-exchanges";
import { ClearanceExit } from "./clearance-exit";
import { takenOf } from "./usage";

const fr = { dialogs, legal, legalClearance };

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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          size="wide"
          closeLabel={fr.dialogs.close}
          className="sm:max-w-[var(--dialog-width-wide)]"
        >
          <DialogHeader className="gap-2">
            <DialogTitle>« {clearance.work} »</DialogTitle>
            <DialogDescription>
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
            </DialogDescription>
            <StatusBadge
              tone={clearanceTone[clearance.status]}
              className="self-start"
            >
              {t.statuses[clearance.status]}
            </StatusBadge>
          </DialogHeader>
          <div className="flex flex-col gap-8">
            <ClearanceBody
              projectId={projectId}
              clearance={clearance}
              context={context}
              showTaken={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** What an authorisation's panel holds (recette Juridique V1, JUR-09): its
 * outcome once closed, « La demande », each right apart, the moment open,
 * then « Échanges » folded (`ClearanceExchanges`) and the other ways out
 * last (`ClearanceExit`). Before anything is asked, « La
 * demande » would only repeat the element and the work: one line says them
 * (`showTaken`, the drawer's header already does), and nothing to secure
 * joins « Autre issue » (Sacha, 07/11/2026). */
export function ClearanceBody({
  projectId,
  clearance,
  context,
  showTaken = true,
  footerBelow = false,
  directionName,
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
  showTaken?: boolean;
  // The démarche shows « Échanges » and « Autre issue » itself, under who
  // answers for it.
  footerBelow?: boolean;
  // Who validates for the direction (the démarche knows), for « En attente
  // de … »; else « La direction ».
  directionName?: string;
}) {
  const t = fr.legalClearance;
  const closed = isClosed(clearance.status);
  const asking = !closed && isAskMoment(clearance.status);
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
      {!asking ? (
        <ClearanceRequest
          projectId={projectId}
          clearance={clearance}
          editable={!closed}
        />
      ) : (
        showTaken && (
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {takenOf(clearance)}
          </p>
        )
      )}
      <ClearanceStages
        projectId={projectId}
        clearance={clearance}
        context={context}
        directionName={directionName}
      />
      {!footerBelow && (
        // Consulted, then the rare way out, last (Sacha, 09/11/2026).
        <div className="flex flex-col gap-3">
          <ClearanceExchanges clearance={clearance} />
          <ClearanceExit projectId={projectId} clearance={clearance} />
        </div>
      )}
    </>
  );
}
