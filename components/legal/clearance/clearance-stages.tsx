"use client";

import { StepSection } from "@/components/shell/journey/step-section";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { momentOf } from "@/lib/legal/clearance/moments";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { formatFee } from "@/lib/legal/contracts/fields";

import { AskMoment } from "./ask-moment";
import { NegotiateMoment } from "./negotiate-moment";
import { SignMoment } from "./sign-moment";

const fr = { legalClearance };

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
    <StepSection
      title={t[moment].title}
      description={t.rank[moment]}
      className="gap-4"
    >
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
