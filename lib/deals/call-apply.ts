import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { settleProposal } from "@/lib/deals/call-settle";
import { dealFailure } from "@/lib/deals/errors";
import { TERM_STATES, TERM_VALUES, termOf } from "@/lib/deals/terms";
import type { DealKind } from "@/lib/deals/types";
import type { Database, Json } from "@/lib/supabase/database.types";

/**
 * Writes every term PO read and the deal still shows as read — value and
 * state — with the caller's session (set_deal_term decides who writes and
 * keeps who and when). A term read twice (two calls): the latest wins, the
 * older is set aside. Each one is checked again by its term's format; one
 * the deal no longer knows how to read stays proposed, for a person.
 * Since 23/11/2026 (Sacha: « ce que PO lit est validé »), right after PO
 * reads a call; « Tout valider » is the same for what was left.
 */
export async function applyTermProposals(
  supabase: SupabaseClient<Database>,
  dealId: string,
  kind: DealKind,
): Promise<{ ok: true; applied: number } | { ok: false; error: string }> {
  const { data: rows, error } = await supabase
    .from("deal_call_proposals")
    .select("id, term_key, value, term_state")
    .eq("deal_id", dealId)
    .eq("status", "proposed")
    .eq("kind", "term")
    .order("created_at");
  if (error) return { ok: false, error: dealFailure("applyTerms", error) };

  const latest = new Map<string, NonNullable<typeof rows>[number]>();
  const older: string[] = [];
  for (const row of rows ?? []) {
    if (!row.term_key) continue;
    const before = latest.get(row.term_key);
    if (before) older.push(before.id);
    latest.set(row.term_key, row);
  }

  let applied = 0;
  for (const row of latest.values()) {
    const term = termOf(kind, row.term_key ?? "");
    const state = z.enum(TERM_STATES).safeParse(row.term_state);
    const value = term && TERM_VALUES[term.format].safeParse(row.value);
    if (!term || !state.success || !value?.success) continue;
    const { error: failed } = await supabase.rpc("set_deal_term", {
      p_deal_id: dealId,
      p_term_key: term.key,
      p_value: value.data as Json,
      p_state: state.data,
    });
    if (failed) return { ok: false, error: dealFailure("applyTerms", failed) };
    await settleProposal(supabase, row.id, "applied");
    applied += 1;
  }
  for (const old of older) await settleProposal(supabase, old, "dismissed");
  return { ok: true, applied };
}
