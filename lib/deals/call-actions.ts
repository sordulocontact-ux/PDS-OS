"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAccess, requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import type { ActionResult } from "@/lib/calls/constants";
import { planCall } from "@/lib/calls/plan-call";
import { dealCallAgenda } from "@/lib/deals/call-prep";
import { settleProposal } from "@/lib/deals/call-settle";
import { dealFailure } from "@/lib/deals/errors";
import { loadDeal } from "@/lib/deals/queries";
import { loadDealTerms } from "@/lib/deals/term-queries";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { deals } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * « Préparer un call » of a deal (BIZ 6): the call form of Calls, its
 * agenda written by the code from the deal (where it stands, the terms not
 * confirmed). Whoever writes the deal plans it (RLS, calls_insert_owner);
 * a deal « à contacter » moves to « Call prévu » by the same gesture
 * (set_deal_stage, the person's own gesture). Opens the call's page.
 */
export async function createDealCall(
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const access = await getAccess();
  if (access.state !== "approved" || !access.organizationId)
    return { ok: false, error: "unauthorized" };
  const dealId = z.uuid().safeParse(String(form.get("dealId") ?? ""));
  if (!dealId.success) return { ok: false, error: "invalid_input" };
  const deal = await loadDeal(access, dealId.data);
  if (!deal?.canWrite) return { ok: false, error: "forbidden" };
  const terms = await loadDealTerms(deal.id, deal.kind);
  const supabase = await createClient();
  const result = await planCall({ access, supabase }, form, null, {
    id: deal.id,
    agenda: dealCallAgenda(deal, terms),
  });
  if (!result.ok) return result;
  if (deal.stage === "to_contact") {
    const { error } = await supabase.rpc("set_deal_stage", {
      p_deal_id: deal.id,
      p_stage: "call_planned",
    });
    if (error) dealFailure("createDealCall", error);
  }
  revalidatePath(routes.deal(deal.id));
  revalidatePath(routes.deals);
  const href = routes.call(result.id);
  redirect(result.meetFailed ? `${href}?meet=failed` : href);
}

/** « Écarter » a proposal of PO: whoever writes the deal. */
export async function dismissDealProposal(
  dealId: string,
  proposalId: string,
): Promise<WriteResult> {
  await requireApproved();
  const ids = z.object({ dealId: z.uuid(), proposalId: z.uuid() });
  const p = ids.safeParse({ dealId, proposalId });
  if (!p.success) return { ok: false, error: deals.errors.invalid };
  const supabase = await createClient();
  const error = await settleProposal(supabase, p.data.proposalId, "dismissed");
  if (error) return { ok: false, error };
  revalidatePath(routes.deal(p.data.dealId));
  return { ok: true, done: dealCalls.proposals.dismissed };
}
