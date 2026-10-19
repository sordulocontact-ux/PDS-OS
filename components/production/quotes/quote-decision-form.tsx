"use client";

import { DecisionPanel } from "@/components/ui/decision-panel";
import { fr } from "@/lib/i18n/fr";
import {
  decideQuote,
  requestQuoteChanges,
} from "@/lib/production/quotes/actions";

const t = fr.productionQuotes.decide;

/** « Décider du devis Vn » (the budget validation, proto): « Valider le
 * devis Vn », « Demander une modification » or « Refuser », with a comment
 * the company reads (`DecisionPanel`). */
export function QuoteDecisionForm({
  projectId,
  quoteId,
  number,
  checkedBy,
}: {
  projectId: string;
  quoteId: string;
  number: number;
  checkedBy: string | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">{t.title(number)}</h3>
      {checkedBy && (
        <p className="text-[color:var(--text-secondary)]">
          {t.checkedBy(checkedBy)}
        </p>
      )}
      <DecisionPanel
        id={`quote-${quoteId}`}
        title={null}
        commentLabel={t.comment}
        commentHint={t.commentHint}
        outcomes={[
          { kind: "approve", label: t.approve(number) },
          { kind: "request_changes", label: t.changes },
          { kind: "refuse", label: t.reject },
        ]}
        onDecide={(kind, comment) =>
          kind === "request_changes"
            ? requestQuoteChanges({ projectId, quoteId, number, comment })
            : decideQuote({
                projectId,
                quoteId,
                number,
                approve: kind === "approve",
                reason: kind === "approve" ? "" : comment,
              })
        }
      />
    </section>
  );
}
