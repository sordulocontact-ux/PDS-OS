"use client";

import { IconCheck, IconPenWriting2, IconXmark } from "nucleo-sharp-essential";

import { IconAction } from "@/components/ui/icon-action";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dismissDealProposal } from "@/lib/deals/call-actions";
import type { DealCallProposal } from "@/lib/deals/call-queries";
import { setDealTerm } from "@/lib/deals/term-actions";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { deals } from "@/lib/i18n/fr/deals";

const fr = { dealCalls, deals };

type TermProposal = Extract<DealCallProposal, { kind: "term" }>;

/**
 * The gestures on a term PO read, as icons (Sacha 22/11/2026: « on ne peut
 * pas valider une carte à la main […] des icônes à la place des trois
 * boutons »): « Valider » writes it as read, « Modifier » opens the term's
 * form prefilled (`onEdit`), « Écarter » sets it aside.
 */
export function TermProposalActions({
  dealId,
  proposal,
  onEdit,
}: {
  dealId: string;
  proposal: TermProposal;
  onEdit: () => void;
}) {
  const t = fr.dealCalls.proposals;
  const apply = useWriteSubmit(undefined, t.applied);
  const dismiss = useWriteSubmit(undefined, t.dismissed);
  const pending = apply.pending || dismiss.pending;
  return (
    <span className="flex items-center gap-1">
      <IconAction
        label={t.dismiss}
        icon={IconXmark}
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        busy={dismiss.pending}
        onClick={() =>
          dismiss.run(() => dismissDealProposal(dealId, proposal.id))
        }
      />
      <IconAction
        label={fr.deals.terms.edit}
        icon={IconPenWriting2}
        size="icon-sm"
        disabled={pending}
        onClick={onEdit}
      />
      <IconAction
        label={t.validate}
        icon={IconCheck}
        variant="default"
        size="icon-sm"
        disabled={pending}
        busy={apply.pending}
        onClick={() =>
          apply.run(() =>
            setDealTerm({
              dealId,
              key: proposal.termKey,
              state: proposal.state,
              value: proposal.value,
              proposalId: proposal.id,
            }),
          )
        }
      />
    </span>
  );
}
