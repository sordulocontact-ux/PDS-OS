"use client";

import { IconSparkle3 } from "nucleo-sharp-essential";
import { useState } from "react";

import { TermForm } from "@/components/deals/term-form";
import {
  TermProposalReview,
  type TermProposal,
} from "@/components/deals/term-proposal-review";
import { FactCard, FactCards, FactSlot } from "@/components/ui/fact-card";
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
 * The terms negotiated in a deal (BIZ 3), one card each in the configured
 * order (Sacha 20/11/2026, proto « Fiche d'un deal » v2): the written ones —
 * value, state as a dot, who changed it last and when —, then the ones still
 * to define as empty slots in the same grid (Sacha 22/11/2026, proto
 * « Termes à définir » v2: a missing term must not read like a written one,
 * and Ibé finds a table to edit « algorithmique »). A card or a slot opens the
 * term in a dialog; the history is in the deal's journal. What PO read in the
 * deal's calls is reviewed one at a time above them (TermProposalReview); a
 * written term it changes is marked (`proposed`) and opens it there, a slot
 * shows what PO read and opens the form prefilled with it.
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
  const termOfKey = new Map(terms.map((term) => [term.key, term]));
  const written = terms.filter((term) => term.state !== "to_define");
  const toDefine = terms.filter((term) => term.state === "to_define");
  const label = (term: DealTerm) => t.labels[term.key] ?? term.key;
  const proposalOf = (key: string) => proposals.find((p) => p.termKey === key);
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
                  ? t.changed(term.changedBy, formatInstantDay(term.changedAt))
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
        {toDefine.map((term) => {
          const name = label(term);
          const proposal = proposalOf(term.key);
          const read = proposal && formatTermValue(term.format, proposal.value);
          return (
            <FactSlot
              key={term.key}
              label={name}
              note={
                read && (
                  <span className="flex items-start gap-1.5 text-caption text-[color:var(--text-secondary)]">
                    <IconSparkle3
                      aria-hidden
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                    <span className="min-w-0 break-words">
                      {fr.dealCalls.review.read}{" "}
                      <b className="font-semibold text-foreground">{read}</b>
                    </span>
                  </span>
                )
              }
              actionText={t.define}
              emptyLabel={t.states.to_define}
              // What PO read: the form prefilled with it.
              onClick={
                canWrite
                  ? () =>
                      setOpen(
                        proposal
                          ? {
                              term: {
                                ...term,
                                value: proposal.value,
                                state: proposal.state,
                              },
                              proposalId: proposal.id,
                            }
                          : { term },
                      )
                  : undefined
              }
              actionLabel={canWrite ? t.editTitle(name) : undefined}
            />
          );
        })}
      </FactCards>
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
