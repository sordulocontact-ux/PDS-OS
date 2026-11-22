"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { settleProposal } from "@/lib/deals/call-settle";
import { dealFailure } from "@/lib/deals/errors";
import { TERM_STATES, TERM_VALUES, termOf } from "@/lib/deals/terms";
import { DEAL_KINDS } from "@/lib/deals/types";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { deals } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * « Tout valider » (Sacha 22/11/2026: « pourquoi on ne les mettrait pas
 * directement pré-remplis […] et après on le fait valider »): every term PO
 * read and the deal still shows is written as read — value and state —, by
 * the person, in one gesture; the database decides who writes (set_deal_term)
 * and keeps the history. A term read twice (two calls): the latest wins, the
 * older is set aside. Each one is checked again by its term's format.
 */
export async function applyDealTermProposals(
  dealId: string,
): Promise<WriteResult> {
  await requireApproved();
  const id = z.uuid().safeParse(dealId);
  if (!id.success) return { ok: false, error: deals.errors.invalid };
  const supabase = await createClient();
  const [{ data: deal }, { data: rows, error }] = await Promise.all([
    supabase.from("deals").select("kind").eq("id", id.data).maybeSingle(),
    supabase
      .from("deal_call_proposals")
      .select("id, term_key, value, term_state")
      .eq("deal_id", id.data)
      .eq("status", "proposed")
      .eq("kind", "term")
      .order("created_at"),
  ]);
  const kind = DEAL_KINDS.find((k) => k === deal?.kind);
  if (error || !kind) return { ok: false, error: deals.errors.notFound };

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
    // A proposal the deal no longer knows how to read is left for a person.
    if (!term || !state.success || !value?.success) continue;
    const { error: failed } = await supabase.rpc("set_deal_term", {
      p_deal_id: id.data,
      p_term_key: term.key,
      p_value: value.data as Json,
      p_state: state.data,
    });
    if (failed)
      return {
        ok: false,
        error: dealFailure("applyDealTermProposals", failed),
      };
    await settleProposal(supabase, row.id, "applied");
    applied += 1;
  }
  for (const old of older) await settleProposal(supabase, old, "dismissed");
  revalidatePath(routes.deal(id.data));
  return { ok: true, done: dealCalls.proposals.allApplied(applied) };
}
