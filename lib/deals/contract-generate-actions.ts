"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  dealFieldValues,
  type DealFieldValue,
} from "@/lib/deals/contract-fields";
import { dealContractDefaults } from "@/lib/deals/contract-defaults";
import { dealFailure } from "@/lib/deals/errors";
import { loadDeal } from "@/lib/deals/queries";
import { deals } from "@/lib/i18n/fr/deals";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { WriteResult } from "@/lib/utils/write-result";

export type DealContractTemplate = {
  id: string;
  name: string;
  fields: string[];
};

export type DealContractDraft = {
  // The deal's kind of contract first (a licence for a label…), then the
  // ones the deal fills best.
  templates: DealContractTemplate[];
  // The first of them, chosen at once.
  recommended: string | null;
  values: Record<string, DealFieldValue>;
};

/** « Générer le contrat », opened: the validated templates of Contrats and
 * what the deal already knows of their fields (dealFieldValues). */
export async function loadDealContractDraft(
  dealId: string,
): Promise<DealContractDraft> {
  const access = await requireApproved();
  const deal = await loadDeal(access, dealId);
  if (!deal) throw new Error("not_found");
  const supabase = await createClient();
  const [{ data: templates }, { data: organization }] = await Promise.all([
    supabase
      .from("contract_templates")
      .select("id, name, type, fields")
      .eq("status", "validated")
      .order("name"),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", access.organizationId ?? "")
      .maybeSingle(),
  ]);
  const values = await dealFieldValues(deal, organization?.name ?? null);
  const wanted = dealContractDefaults(deal).type;
  const filled = (fields: string[]) =>
    fields.filter((id) => values[id]).length / Math.max(fields.length, 1);
  // The deal's kind of contract first, made for deals (it asks for their
  // terms) before one made for a project's title (a featuring), then the one
  // it fills best.
  const forDeals = (fields: string[]) =>
    fields.some((id) => id.startsWith("deal."));
  const sorted = [...(templates ?? [])].sort(
    (a, b) =>
      Number(b.type === wanted) - Number(a.type === wanted) ||
      Number(forDeals(b.fields)) - Number(forDeals(a.fields)) ||
      filled(b.fields) - filled(a.fields) ||
      a.name.localeCompare(b.name, "fr"),
  );
  return {
    templates: sorted.map((t) => ({
      id: t.id,
      name: t.name,
      fields: t.fields,
    })),
    recommended: sorted[0]?.id ?? null,
    values,
  };
}

const input = z.object({
  dealId: z.uuid(),
  templateId: z.uuid(),
  fields: z.record(
    z.string().max(80),
    z.object({
      value: z.string().trim().max(2000),
      source: z.string().max(200),
    }),
  ),
});

/** The contract generated from the template, every value checked by the
 * person (generate_deal_contract): the deal's contract at once. */
export async function generateDealContract(
  raw: z.input<typeof input>,
): Promise<WriteResult> {
  await requireApproved();
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: deals.errors.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("generate_deal_contract", {
    p_deal_id: p.data.dealId,
    p_template_id: p.data.templateId,
    p_fields: p.data.fields as Json,
  });
  if (error)
    return { ok: false, error: dealFailure("generateDealContract", error) };
  revalidatePath(routes.deal(p.data.dealId));
  return { ok: true, done: dealMemos.contract.generated };
}
