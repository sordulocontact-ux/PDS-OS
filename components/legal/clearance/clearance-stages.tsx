"use client";

import { StepSection } from "@/components/shell/journey/step-section";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import type { ClearanceStatus } from "@/lib/legal/clearance/matrix";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { formatFee } from "@/lib/legal/contracts/fields";

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

/** The open moment of a clearance, none once closed. */
export const momentOf = (status: ClearanceStatus) =>
  MOMENTS[MOMENT_OF[status]] ?? null;

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
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
}) {
  const t = fr.legalClearance.stages;
  const moment = momentOf(clearance.status);
  if (!moment) return null;
  return (
    <StepSection title={t[moment].title} className="gap-4">
      {moment === "ask" && (
        <AskMoment projectId={projectId} clearance={clearance} />
      )}
      {moment === "negotiate" && (
        <NegotiateMoment
          projectId={projectId}
          clearance={clearance}
          canValidate={context.canValidate}
        />
      )}
      {moment === "sign" && (
        <SignMoment
          projectId={projectId}
          clearance={clearance}
          context={context}
        />
      )}
    </StepSection>
  );
}
