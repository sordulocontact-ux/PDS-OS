"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { factLabel } from "@/lib/legal/intake/labels";
import type { ProposedFact, QuestionKey } from "@/lib/legal/intake/types";

/**
 * What PO read in the answer, before anything is kept: each fact with the
 * words it comes from, and a way to remove it (ticket Juridique 01:
 * « confirmer toute interprétation ambiguë ayant un impact juridique »).
 */
export function ProposalReview({
  question,
  facts,
  dropped,
  onRemove,
}: {
  question: QuestionKey;
  facts: ProposedFact[];
  dropped: number;
  onRemove: (index: number) => void;
}) {
  const t = fr.legal.intake;
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{t.reviewTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.reviewHint}</p>
      </div>
      {facts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.nothingFound}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {facts.map((fact, index) => {
            const label = factLabel(fact, question);
            return (
              <li
                key={`${label}-${index}`}
                className="flex items-start justify-between gap-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium break-words">{label}</span>
                  {fact.quote && (
                    <span className="text-sm break-words text-muted-foreground">
                      « {fact.quote} »
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.remove(label)}
                  onClick={() => onRemove(index)}
                >
                  <IconXmark aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {dropped > 0 && (
        <p className="text-sm text-muted-foreground">{t.dropped(dropped)}</p>
      )}
    </div>
  );
}
