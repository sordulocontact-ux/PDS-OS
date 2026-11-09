"use client";

import { StepSection } from "@/components/shell/journey/step-section";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import type { ClearanceStatus } from "@/lib/legal/clearance/matrix";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { formatFee } from "@/lib/legal/contracts/fields";
import { formatInstant } from "@/lib/utils/instant";

import { AskMoment } from "./ask-moment";
import { NegotiateMoment } from "./negotiate-moment";
import { SignMoment } from "./sign-moment";

const fr = { legalClearance };

// The ticket's nine states, as three moments for the person (the prototype
// of 07/10/2026): ask the rights holders, negotiate their conditions, get
// the contract signed with its proof. Closed: none.
const MOMENTS = ["ask", "negotiate", "sign"] as const;
const MOMENT_OF: Record<ClearanceStatus, number> = {
  to_investigate: 0,
  rightsholders_identified: 0,
  contacted: 1,
  waiting_external: 1,
  negotiating: 1,
  refused: 1,
  action_required: 1,
  agreement_reached: 2,
  document_pending: 2,
  signed: 2,
  cleared: 3,
  abandoned: 3,
};

/** The moment of « Demander »: nothing asked yet. */
export function isAskMoment(status: ClearanceStatus): boolean {
  return MOMENT_OF[status] === 0;
}

/** The validated conditions in a few words (« 600 € · 5 % »). */
export function termsLine(clearance: Clearance): string {
  const terms = clearance.terms.find((x) => x.status === "validated");
  if (!terms) return "";
  return [
    terms.amountCents !== null ? formatFee(terms.amountCents) : null,
    terms.share,
    terms.credits,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The moment of a clearance that is open — ask the rights holders,
 * negotiate their conditions, get the licence signed — under its title,
 * with the one action that ends it (recette Juridique V1: no frise, one
 * title at a time; what was done is in « La demande » and the rights
 * above). Every state still moves through advance_clearance, which checks
 * what it needs.
 */
export function ClearanceStages({
  projectId,
  clearance,
  context,
  directionName,
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
  directionName?: string;
}) {
  const t = fr.legalClearance.stages;
  const moment = MOMENTS[MOMENT_OF[clearance.status]];
  if (!moment) return null;
  // « Demander » needs no title over its own sections (Sacha, 07/11/2026).
  if (moment === "ask")
    return (
      <AskMoment
        projectId={projectId}
        clearance={clearance}
        canEmail={context.emailEnabled}
      />
    );
  return (
    <StepSection
      title={t[moment].title}
      // « Demandé à … le … »: read with its title (Sacha, 09/11/2026).
      description={moment === "negotiate" ? askedLine(clearance) : undefined}
    >
      {moment === "negotiate" && (
        <NegotiateMoment
          projectId={projectId}
          clearance={clearance}
          canValidate={context.canValidate}
          directionName={directionName}
        />
      )}
      {moment === "sign" && (
        <SignMoment
          projectId={projectId}
          clearance={clearance}
          context={context}
          directionName={directionName}
        />
      )}
    </StepSection>
  );
}

/** « Demandé à X le … » under « Négocier ». */
function askedLine(clearance: Clearance): string {
  const names = clearance.holders.map((h) => h.name).join(" et ");
  const askedOn = clearance.exchanges.find((e) => e.direction === "out")?.at;
  return fr.legalClearance.flow.askedTo(
    names || fr.legalClearance.flow.holdersFallback,
    askedOn ? formatInstant(askedOn) : "",
  );
}
