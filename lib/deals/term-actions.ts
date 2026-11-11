"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { dealFailure } from "@/lib/deals/errors";
import { TERM_STATES, TERM_VALUES, termOf } from "@/lib/deals/terms";
import { DEAL_KINDS } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { WriteResult } from "@/lib/utils/write-result";

const t = deals;

const input = z.object({
  dealId: z.uuid(),
  key: z.string().min(1).max(40),
  state: z.enum(TERM_STATES),
  value: z.unknown(),
});
export type DealTermInput = z.input<typeof input>;

/** « Modifier un terme » (BIZ 3): the term must be one of the deal's kind
 * (lib/deals/terms.ts), its value of its format; « À définir » drops it.
 * The database decides who writes and keeps the history. */
export async function setDealTerm(raw: DealTermInput): Promise<WriteResult> {
  await requireApproved();
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: t.errors.invalid };
  const supabase = await createClient();
  const { data: deal } = await supabase
    .from("deals")
    .select("kind")
    .eq("id", p.data.dealId)
    .maybeSingle();
  const kind = z.enum(DEAL_KINDS).safeParse(deal?.kind);
  if (!kind.success) return { ok: false, error: t.errors.notFound };
  const term = termOf(kind.data, p.data.key);
  if (!term) return { ok: false, error: t.errors.termUnknown };

  let value: Json | null = null;
  if (p.data.state !== "to_define") {
    const parsed = TERM_VALUES[term.format].safeParse(p.data.value);
    if (!parsed.success) return { ok: false, error: t.errors.invalid };
    value = parsed.data as Json;
  }
  const { error } = await supabase.rpc("set_deal_term", {
    p_deal_id: p.data.dealId,
    p_term_key: term.key,
    p_value: value,
    p_state: p.data.state,
  });
  if (error) return { ok: false, error: dealFailure("setDealTerm", error) };
  revalidatePath(routes.deal(p.data.dealId));
  return { ok: true, done: t.done.term };
}
