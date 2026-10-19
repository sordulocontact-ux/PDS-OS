"use client";

import { ProposalRow } from "@/components/ui/proposal-row";
import type { Proposal } from "@/lib/ui/proposal";

const none = async () => ({ ok: true as const });

/** A confirmed intention, read only (« Confirmé »), with its source. */
export function KeptIntentionRow({ proposal }: { proposal: Proposal }) {
  return (
    <ProposalRow
      proposal={proposal}
      canEdit={false}
      onConfirm={none}
      onDiscard={none}
    />
  );
}
