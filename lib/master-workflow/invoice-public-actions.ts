"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { LINK_KEY, linkKeyArgs, linkKeyPath } from "@/lib/portal/link-key";
import { createClient } from "@/lib/supabase/server";

// « Envoyer ma facture » from the engineer's link, without an account
// (docs/projet-complet/master.md § 9). Two steps, as a version's deposit:
// the database opens a one-time path of the master-finance bucket, the
// browser uploads the PDF there, then submit_master_invoice checks the
// file, the amount against the rate committed, the RIB, and records it.

const t = fr.masterInvoice.fields.errors;
type Code = keyof typeof t;

/** The database's refusal, as the page words it. */
export async function invoiceError(message: string | undefined) {
  const code = (Object.keys(t) as Code[]).find((c) => message?.includes(c));
  return t[code ?? "failed"];
}

export async function openInvoiceSlot(
  key: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!LINK_KEY.test(key)) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_master_invoice_slot", {
    ...linkKeyArgs(key),
  });
  if (error || !data) {
    console.error("openInvoiceSlot:", error?.message);
    return { ok: false, error: await invoiceError(error?.message) };
  }
  return { ok: true, path: data };
}

const invoice = z.object({
  path: z.string().min(1).max(300),
  fileName: z.string().trim().min(1).max(255),
  number: z.string().trim().min(1).max(60),
  amountCents: z.number().int().min(1).max(100_000_000),
  reason: z.string().trim().max(1000).nullable(),
  iban: z.string().trim().max(50).nullable(),
  bic: z.string().trim().max(20).nullable(),
  holder: z.string().trim().max(200).nullable(),
});
export type InvoiceInput = z.input<typeof invoice>;

export async function submitInvoice(
  key: string,
  input: InvoiceInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = invoice.safeParse(input);
  if (!LINK_KEY.test(key) || !parsed.success)
    return { ok: false, error: t.failed };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_master_invoice", {
    ...linkKeyArgs(key),
    p_path: v.path,
    p_file_name: v.fileName,
    p_mime: "application/pdf",
    p_number: v.number,
    p_amount_cents: v.amountCents,
    p_reason: v.reason || null,
    p_iban: v.iban || null,
    p_bic: v.bic || null,
    p_holder: v.holder || null,
  });
  if (error) {
    console.error("submitInvoice:", error.message);
    return { ok: false, error: await invoiceError(error.message) };
  }
  revalidatePath(linkKeyPath("m", key));
  return { ok: true };
}
