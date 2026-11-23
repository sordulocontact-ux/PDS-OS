"use client";

import { useState } from "react";

import { TranscriptPassageDialog } from "@/components/calls/transcript-passage-dialog";
import type { DealCallProposal } from "@/lib/deals/call-queries";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { formatInstantDay } from "@/lib/utils/instant";

const fr = { dealCalls };

/**
 * Where a proposal of PO comes from (Sacha 22/11/2026): who said it when the
 * transcript says (« Sarah Benali : »), the passage, then the call — a
 * button that opens its transcript on that very line
 * (TranscriptPassageDialog), the page staying.
 */
export function ProposalSource({ proposal }: { proposal: DealCallProposal }) {
  const [open, setOpen] = useState(false);
  const call = fr.dealCalls.proposals.call(
    proposal.callTitle,
    formatInstantDay(proposal.callAt),
  );
  return (
    <span className="text-caption break-words text-[color:var(--text-secondary)]">
      {proposal.speaker && (
        <span className="font-semibold text-foreground">
          {fr.dealCalls.proposals.said(proposal.speaker)}{" "}
        </span>
      )}
      « {proposal.quote} » ·{" "}
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Inline and left: a button is an inline block, its text centred
        // on a line of its own once it wraps (Sacha 23/11/2026).
        className="inline cursor-pointer text-left underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--selection)]"
      >
        {call}
      </button>
      <TranscriptPassageDialog
        open={open}
        onOpenChange={setOpen}
        callId={proposal.callId}
        title={call}
        quote={proposal.quote}
      />
    </span>
  );
}
