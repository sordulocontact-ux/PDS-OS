"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { applyTermProposals } from "@/lib/deals/call-apply";
import { DEAL_KINDS } from "@/lib/deals/types";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { deals } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";
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
  const { data: deal } = await supabase
    .from("deals")
    .select("kind")
    .eq("id", id.data)
    .maybeSingle();
  const kind = DEAL_KINDS.find((k) => k === deal?.kind);
  if (!kind) return { ok: false, error: deals.errors.notFound };
  const result = await applyTermProposals(supabase, id.data, kind);
  if (!result.ok) return result;
  const applied = result.applied;
  revalidatePath(routes.deal(id.data));
  return { ok: true, done: dealCalls.proposals.allApplied(applied) };
}
