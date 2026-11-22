"use client";

import { IconSparkle3 } from "nucleo-sharp-essential";
import { useState } from "react";

import { ProposalSource } from "@/components/deals/proposal-source";
import { TermForm } from "@/components/deals/term-form";
import { TermProposalActions } from "@/components/deals/term-proposal-actions";
import { Button } from "@/components/ui/button";
import { FactCard, FactCards, FactSlot } from "@/components/ui/fact-card";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { DealCallProposal } from "@/lib/deals/call-queries";
import { applyDealTermProposals } from "@/lib/deals/proposal-actions";
import { formatTermValue } from "@/lib/deals/term-format";
import type { DealTerm, TermFormat } from "@/lib/deals/terms";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { deals } from "@/lib/i18n/fr/deals";
import { dealTermTone } from "@/lib/ui/state-tones";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { dealCalls, deals, dialogs };

export type TermProposal = Extract<DealCallProposal, { kind: "term" }>;

// Words, not a figure: shown at reading size in their card.
const TEXT_FORMATS = new Set<TermFormat>(["text", "yesno", "split"]);

/** « PO a lu 4 termes · à vérifier », then « Tout valider ». */
function ProposalsBar({
  dealId,
  count,
  canWrite,
}: {
  dealId: string;
  count: number;
  canWrite: boolean;
}) {
  const t = fr.dealCalls.proposals;
  const { pending, error, run } = useWriteSubmit(undefined, "");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex flex-1 items-center gap-1.5 text-body-sm text-[color:var(--text-secondary)]">
        <IconSparkle3 aria-hidden className="size-4 shrink-0" />
        {t.toCheck(count)}
      </span>
      {canWrite && (
        <Button
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => run(() => applyDealTermProposals(dealId))}
        >
          {t.applyAll}
        </Button>
      )}
      {error && (
        <p role="alert" className="w-full text-caption text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The terms negotiated in a deal (BIZ 3), one card each in the configured
 * order (Sacha 20/11/2026, proto « Fiche d'un deal » v2): value, state as a
 * dot, who changed it last and when; the ones still to define are empty slots
 * in the same grid (Sacha 22/11/2026, proto « Termes à définir » v2). What PO
 * read in the deal's calls is already in its term's card, to check (Sacha
 * 22/11/2026: « pré-remplis avec ce que PDS OS a trouvé, et après on le fait
 * valider »): the value read — the one written before struck through —, its
 * state, who said it and where (the call opens its transcript), « Valider »,
 * « Modifier » and « Écarter » as icons (TermProposalActions); « Tout valider » writes them all as read. A term read twice
 * shows the latest. A card or a slot opens the term in a dialog; the history
 * is in the deal's journal.
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
  // PO's term proposals from the deal's calls, still to check, oldest first.
  proposals?: TermProposal[];
}) {
  const t = fr.deals.terms;
  const [open, setOpen] = useState<{
    term: DealTerm;
    proposalId?: string;
  } | null>(null);
  const read = new Map(proposals.map((p) => [p.termKey, p]));
  const label = (term: DealTerm) => t.labels[term.key] ?? term.key;
  // Written or read by PO first, then the slots to fill, in the configured order.
  const filled = terms.filter(
    (term) => term.state !== "to_define" || read.has(term.key),
  );
  const empty = terms.filter(
    (term) => term.state === "to_define" && !read.has(term.key),
  );

  const proposedCard = (term: DealTerm, p: TermProposal) => {
    const before =
      term.state === "to_define"
        ? null
        : formatTermValue(term.format, term.value);
    const after = formatTermValue(term.format, p.value) ?? "";
    return (
      <FactCard
        key={term.key}
        proposed
        label={label(term)}
        value={
          before && before !== after ? (
            <>
              <s className="font-normal text-[color:var(--text-tertiary)]">
                {before}
              </s>{" "}
              {after}
            </>
          ) : (
            after
          )
        }
        text={TEXT_FORMATS.has(term.format)}
        note={<ProposalSource proposal={p} />}
        state={{ tone: dealTermTone[p.state], label: t.states[p.state] }}
        action={
          canWrite && (
            <TermProposalActions
              dealId={dealId}
              proposal={p}
              onEdit={() =>
                setOpen({
                  term: { ...term, value: p.value, state: p.state },
                  proposalId: p.id,
                })
              }
            />
          )
        }
      />
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {read.size > 0 && (
        <ProposalsBar dealId={dealId} count={read.size} canWrite={canWrite} />
      )}
      <FactCards>
        {filled.map((term) => {
          const p = read.get(term.key);
          if (p) return proposedCard(term, p);
          const name = label(term);
          return (
            <FactCard
              key={term.key}
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
              onClick={canWrite ? () => setOpen({ term }) : undefined}
              actionLabel={canWrite ? t.editTitle(name) : undefined}
            />
          );
        })}
        {empty.map((term) => {
          const name = label(term);
          return (
            <FactSlot
              key={term.key}
              label={name}
              actionText={t.define}
              emptyLabel={t.states.to_define}
              onClick={canWrite ? () => setOpen({ term }) : undefined}
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
