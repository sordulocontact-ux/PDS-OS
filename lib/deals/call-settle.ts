import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { dealFailure } from "@/lib/deals/errors";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import type { Database } from "@/lib/supabase/database.types";

const MESSAGES: Record<string, string> = dealCalls.proposals.errors;

/** Settles one of PO's proposals (BIZ 6): « applied » after the person
 * saved the real form, « dismissed » when set aside. Null when done, else
 * the message in French. */
export async function settleProposal(
  supabase: SupabaseClient<Database>,
  proposalId: string,
  status: "applied" | "dismissed",
): Promise<string | null> {
  const { error } = await supabase.rpc("settle_deal_call_proposal", {
    p_proposal_id: proposalId,
    p_status: status,
  });
  if (!error) return null;
  return MESSAGES[error.message ?? ""] ?? dealFailure("settleProposal", error);
}
