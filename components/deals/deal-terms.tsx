"use client";

import { useState } from "react";

import { TermForm } from "@/components/deals/term-form";
import {
  TermProposalReview,
  type TermProposal,
} from "@/components/deals/term-proposal-review";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FactCard, FactCards } from "@/components/ui/fact-card";
import { FormDialog } from "@/components/ui/form-dialog";
import { formatTermValue } from "@/lib/deals/term-format";
import type { DealTerm, TermFormat } from "@/lib/deals/terms";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { deals } from "@/lib/i18n/fr/deals";
import { dealTermTone } from "@/lib/ui/state-tones";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { dealCalls, deals, dialogs };

// Words, not a figure: shown at reading size in their card.
const TEXT_FORMATS = new Set<TermFormat>(["text", "yesno", "split"]);

/**
 * The terms negotiated in a deal (BIZ 3): the ones written, one card each in
 * the configured order (Sacha 20/11/2026, proto « Fiche d'un deal » v2) — its
 * value, its state as a dot, who changed it last and when; then the ones still to define on one line (Sacha
 * 20/11/2026: nine rows « À définir » made the page a table), each a
 * button for whoever writes the deal. A card or a button opens the term in a
 * dialog; the history is in the deal's journal. What PO read in the deal's
 * calls is reviewed one at a time above them (TermProposalReview, Sacha
 * 21/11/2026: « une section complète », « une autre ergonomie »); its term's
 * card is marked (`proposed`) and opens it there.
 */
export function DealTerms({
  dealId,
  terms,
  canWrite,
  proposals = [],
}: {
  dealId: string;
  terms: DealTerm[];
  canWrite: boolean;
  // PO's term proposals from the deal's calls, still to check.
  proposals?: TermProposal[];
}) {
  const t = fr.deals.terms;
  const [open, setOpen] = useState<{
    term: DealTerm;
    proposalId?: string;
  } | null>(null);
  const [index, setIndex] = useState(0);
  const at = Math.max(0, Math.min(index, proposals.length - 1));
  const proposedKeys = new Set(proposals.map((p) => p.termKey));
  const termOfKey = new Map(terms.map((term) => [term.key, term]));
  // The written ones and the proposed ones, in the configured order.
  const written = terms.filter(
    (term) => term.state !== "to_define" || proposedKeys.has(term.key),
  );
  const toDefine = terms.filter(
    (term) => term.state === "to_define" && !proposedKeys.has(term.key),
  );
  const label = (term: DealTerm) => t.labels[term.key] ?? term.key;
  const toDefineButtons = (className?: string) => (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {toDefine.map((term) => (
        <Button
          key={term.key}
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setOpen({ term })}
          aria-label={t.editTitle(label(term))}
        >
          {label(term)}
        </Button>
      ))}
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      {proposals.length > 0 && (
        <TermProposalReview
          dealId={dealId}
          proposals={proposals}
          terms={termOfKey}
          index={at}
          onIndex={setIndex}
          onEdit={(term, proposalId) => setOpen({ term, proposalId })}
          canWrite={canWrite}
        />
      )}
      {written.length > 0 && (
        <FactCards>
          {written.map((term) => {
            const name = label(term);
            const proposal = proposals.findIndex((p) => p.termKey === term.key);
            return (
              <FactCard
                key={term.key}
                proposed={proposal >= 0}
                label={name}
                value={
                  formatTermValue(term.format, term.value) ?? t.states.to_define
                }
                text={TEXT_FORMATS.has(term.format)}
                state={{
                  tone: dealTermTone[term.state],
                  label: t.states[term.state],
                }}
                source={
                  term.changedBy && term.changedAt
                    ? t.changed(
                        term.changedBy,
                        formatInstantDay(term.changedAt),
                      )
                    : null
                }
                // Proposed: its proposal in the review above.
                onClick={
                  proposal >= 0
                    ? () => setIndex(proposal)
                    : canWrite
                      ? () => setOpen({ term })
                      : undefined
                }
                actionLabel={
                  proposal >= 0
                    ? fr.dealCalls.review.show(name)
                    : canWrite
                      ? t.editTitle(name)
                      : undefined
                }
              />
            );
          })}
        </FactCards>
      )}
      {toDefine.length > 0 &&
        (written.length === 0 && proposals.length === 0 ? (
          // None written yet: the empty note of the deal's other sections,
          // the terms to define as its buttons (Sacha 20/11/2026).
          <EmptyNote action={canWrite && toDefineButtons("justify-center")}>
            {t.noneWritten}
            {!canWrite && ` ${toDefine.map(label).join(", ")}`}
          </EmptyNote>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
              {t.toDefine}
              {!canWrite && ` ${toDefine.map(label).join(", ")}`}
            </p>
            {canWrite && toDefineButtons()}
          </div>
        ))}
      <FormDialog
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
        title={
          open ? t.editTitle(t.labels[open.term.key] ?? open.term.key) : ""
        }
        description={open ? t.states[open.term.state] : ""}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <TermForm
            dealId={dealId}
            term={open.term}
            proposalId={open.proposalId}
            onDone={() => setOpen(null)}
          />
        )}
      </FormDialog>
    </div>
  );
}
