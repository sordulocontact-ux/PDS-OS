"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { recordCatalogFile } from "@/lib/catalog/file-actions";
import { FILE_BUCKETS } from "@/lib/catalog/file-rules";
import { getContractDocument } from "@/lib/legal/contracts/document";
import { documentFileName } from "@/lib/legal/contracts/document-name";
import { contractPdf } from "@/lib/legal/contracts/document-pdf";
import { loadContractLetterhead } from "@/lib/legal/contracts/letterhead";
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
      .select("name, billing:organization_billing(legal_name)")
      .eq("id", access.organizationId ?? "")
      .maybeSingle(),
  ]);
  // Its legal name (Réglages › Coordonnées), else its name in PDS OS.
  const values = await dealFieldValues(
    deal,
    organization?.billing?.[0]?.legal_name ?? organization?.name ?? null,
  );
  const wanted = dealContractDefaults(deal, null).type;
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

/** The PDF of a generated contract's latest version, filed among its files
 * (category « draft »): the same print as « Télécharger le PDF ». */
async function fileContractPdf(contractId: string, organizationId: string) {
  const supabase = await createClient();
  const [{ data: contract }, document] = await Promise.all([
    supabase.from("contracts").select("title").eq("id", contractId).single(),
    getContractDocument(contractId),
  ]);
  if (!contract || !document) return;
  const pdf = await contractPdf({
    title: contract.title,
    body: document.latest.body,
    language: document.language,
    letterhead: await loadContractLetterhead(supabase, contractId),
  });
  const path = `${organizationId}/${contractId}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from(FILE_BUCKETS.contract)
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error(error.message);
  const recorded = await recordCatalogFile({
    owner: { kind: "contract", id: contractId },
    path,
    category: "draft",
    fileName: documentFileName(`${contract.title} v${document.latest.version}`),
    mime: "application/pdf",
    bytes: pdf.byteLength,
  });
  if (!recorded.ok) throw new Error(recorded.error);
}

/** The contract generated from the template, every value checked by the
 * person (generate_deal_contract): the deal's contract at once. */
export async function generateDealContract(
  raw: z.input<typeof input>,
): Promise<WriteResult> {
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: deals.errors.invalid };
  const access = await requireApproved();
  const supabase = await createClient();
  const { data: contractId, error } = await supabase.rpc(
    "generate_deal_contract",
    {
      p_deal_id: p.data.dealId,
      p_template_id: p.data.templateId,
      p_fields: p.data.fields as Json,
    },
  );
  if (error || !contractId)
    return {
      ok: false,
      error: dealFailure("generateDealContract", error ?? {}),
    };
  // Printed at once and filed with it (Sacha 22/11/2026: « dès qu'on crée le
  // contrat, en base, on exporte avant »): opening it is then instant, in
  // the browser. A failed print leaves the contract, printed on demand.
  if (access.organizationId)
    await fileContractPdf(contractId, access.organizationId).catch((e) =>
      console.error("generateDealContract pdf:", e),
    );
  revalidatePath(routes.deal(p.data.dealId));
  return { ok: true, done: dealMemos.contract.generated };
}
