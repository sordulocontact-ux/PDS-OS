import "server-only";

import type { DraftProposal } from "@/lib/assistant/drafts";
import type { Source } from "@/lib/assistant/sources";
import type { Verbatim } from "@/lib/assistant/verbatim";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";

export type ProposeContext = {
  access: Access;
  verbatim: Verbatim;
  // The page PO was opened from: "this project" when none is named.
  pagePath?: string | null;
};

/**
 * What a propose_* function returns: the draft for the card, and facts for
 * the model (what is proposed, what could not be). Nothing is written.
 */
export function proposalResult({
  source,
  ...proposal
}: DraftProposal & { source: Source | null }) {
  const t = fr.assistant.drafts;
  return {
    proposal,
    facts: [
      t.ready(proposal.title),
      ...proposal.changes.map((c) => `${c.label} : ${c.after}`),
      ...proposal.warnings,
    ],
    sources: source ? [source] : [],
  };
}
