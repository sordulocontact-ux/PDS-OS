"use client";

import { useState } from "react";

import { NextActionForm } from "@/components/deals/deal-next-action";
import { DealStageForm } from "@/components/deals/deal-stage-form";
import { TermForm } from "@/components/deals/term-form";
import { Button } from "@/components/ui/button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { dismissDealProposal } from "@/lib/deals/call-actions";
import type { DealCallProposal } from "@/lib/deals/call-queries";
import { formatTermValue } from "@/lib/deals/term-format";
import { termOf, type DealTerm } from "@/lib/deals/terms";
import type { Deal } from "@/lib/deals/types";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { deals } from "@/lib/i18n/fr/deals";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { formatDay } from "@/lib/utils/day";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { dealCalls, deals, dialogs };
const t = fr.dealCalls.proposals;

/** The proposal in words: « Avance ou cachet : Avance de 2 000 € HT
 * (Contre-proposition) », « Passer à l'étape … », « Prochaine action : … ». */
function textOf(deal: Deal, p: DealCallProposal): string {
  if (p.kind === "stage") return t.stage(fr.deals.stages[p.stage]);
  if (p.kind === "next_action")
    return t.next(p.action, p.on ? formatDay(p.on) : null);
  const term = termOf(deal.kind, p.termKey);
  return t.term(
    fr.deals.terms.labels[p.termKey] ?? p.termKey,
    (term && formatTermValue(term.format, p.value)) ?? "",
    fr.deals.terms.states[p.state],
  );
}

/** The real form a proposal opens, prefilled with it. */
function ProposalForm({
  deal,
  proposal,
  onDone,
}: {
  deal: Deal;
  proposal: DealCallProposal;
  onDone: () => void;
}) {
  if (proposal.kind === "stage")
    return (
      <DealStageForm
        deal={deal}
        proposal={{
          id: proposal.id,
          stage: proposal.stage,
          note: proposal.quote,
        }}
        onDone={onDone}
      />
    );
  if (proposal.kind === "next_action")
    return (
      <NextActionForm
        deal={deal}
        proposal={{ id: proposal.id, action: proposal.action, on: proposal.on }}
        onDone={onDone}
      />
    );
  const definition = termOf(deal.kind, proposal.termKey);
  if (!definition) return null;
  const term: DealTerm = {
    key: definition.key,
    format: definition.format,
    value: proposal.value,
    state: proposal.state,
    changedBy: null,
    changedAt: null,
  };
  return (
    <TermForm
      dealId={deal.id}
      term={term}
      proposalId={proposal.id}
      onDone={onDone}
    />
  );
}

function DismissButton({ dealId, id }: { dealId: string; id: string }) {
  const { pending, run } = useWriteSubmit(() => {}, t.dismissed);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => run(() => dismissDealProposal(dealId, id))}
    >
      {t.dismiss}
    </Button>
  );
}

/**
 * PO's proposals from the deal's calls (BIZ 6), each with the passage it
 * comes from. « Vérifier » opens the deal's real form prefilled with it:
 * the person corrects and saves (the proposal is then applied); « Écarter »
 * sets it aside. PO never changes the deal by itself.
 */
export function DealCallProposals({
  deal,
  proposals,
}: {
  deal: Deal;
  proposals: DealCallProposal[];
}) {
  const [open, setOpen] = useState<DealCallProposal | null>(null);
  return (
    <>
      <FactRows>
        {proposals.map((p) => (
          <FactRow
            key={p.id}
            value={textOf(deal, p)}
            source={{
              quote: p.quote,
              from: t.from(p.callTitle, formatInstantDay(p.callAt)),
              href: routes.call(p.callId),
            }}
            side={
              deal.canWrite ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(p)}
                  >
                    {t.check}
                  </Button>
                  <DismissButton dealId={deal.id} id={p.id} />
                </div>
              ) : null
            }
          />
        ))}
      </FactRows>
      <FormDialog
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
        title={open ? textOf(deal, open) : ""}
        description={
          open ? t.from(open.callTitle, formatInstantDay(open.callAt)) : ""
        }
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <ProposalForm
            deal={deal}
            proposal={open}
            onDone={() => setOpen(null)}
          />
        )}
      </FormDialog>
    </>
  );
}
