"use client";

import { DecisionPanel } from "@/components/ui/decision-panel";
import { fr } from "@/lib/i18n/fr";
import { decideQuote } from "@/lib/production/quotes/actions";

const t = fr.productionQuotes.decide;

/** The validator's decision: « Valider le devis », or « Refuser » with a
 * reason the depositor reads (`DecisionPanel`). */
export function QuoteDecisionForm({
  projectId,
  quoteId,
}: {
  projectId: string;
  quoteId: string;
}) {
  return (
    <DecisionPanel
      id={`quote-${quoteId}`}
      title={null}
      commentLabel={t.reason}
      commentHint={null}
      commentPlaceholder={t.reasonPlaceholder}
      commentRequired={t.reasonRequired}
      outcomes={[
        { kind: "approve", label: t.approve, done: t.approved },
        { kind: "refuse", label: t.reject, done: t.rejected },
      ]}
      onDecide={(kind, reason) =>
        decideQuote({
          projectId,
          quoteId,
          approve: kind === "approve",
          reason: kind === "approve" ? "" : reason,
        })
      }
    />
  );
}
