"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

import { invoiceError } from "./errors";

// « Envoyer ma facture » from a person's private link, without an account
// (one system, 20/10/2026). Two steps: the database opens a one-time path
// of the private bucket, the browser uploads the PDF there, then
// submit_person_invoice checks the link, the file, the amount against what
// was agreed and the RIB, and records it.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const token = z.string().regex(/^[0-9a-f]{64}$/);
const failed = fr.invoices.errors.failed;

// The token is the engineer's link or the person's page.
const refresh = (t: string) => {
  revalidatePath(`/m/${t}`);
  revalidatePath(`/c/${t}`);
};

export async function openPersonInvoiceSlot(
  key: string,
  invoiceId: string,
): Promise<Result<{ path: string }>> {
  if (!token.safeParse(key).success || !z.uuid().safeParse(invoiceId).success)
    return { ok: false, error: failed };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_person_invoice_slot", {
    p_token: key,
    p_invoice_id: invoiceId,
    p_ext: "pdf",
  });
  if (error || !data) {
    if (error) console.error("openPersonInvoiceSlot:", error.message);
    return { ok: false, error: invoiceError(error?.message) };
  }
  return { ok: true, path: data };
}

const invoice = z.object({
  path: z.string().min(1).max(400),
  fileName: z.string().trim().min(1).max(255),
  number: z.string().trim().min(1).max(100),
  amountCents: z.number().int().min(1).max(100_000_000),
  reason: z.string().trim().max(2000).nullable(),
  iban: z.string().trim().max(50).nullable(),
  bic: z.string().trim().max(20).nullable(),
  holder: z.string().trim().max(200).nullable(),
});

export async function submitPersonInvoice(
  key: string,
  invoiceId: string,
  input: z.input<typeof invoice>,
): Promise<Result> {
  const v = invoice.safeParse(input);
  if (
    !token.safeParse(key).success ||
    !z.uuid().safeParse(invoiceId).success ||
    !v.success
  )
    return { ok: false, error: failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_person_invoice", {
    p_token: key,
    p_invoice_id: invoiceId,
    p_path: v.data.path,
    p_file_name: v.data.fileName,
    p_mime: "application/pdf",
    p_number: v.data.number,
    p_amount_cents: v.data.amountCents,
    p_reason: v.data.reason || null,
    p_iban: v.data.iban || null,
    p_bic: v.data.bic || null,
    p_holder: v.data.holder || null,
  });
  if (error) {
    console.error("submitPersonInvoice:", error.message);
    return { ok: false, error: invoiceError(error.message) };
  }
  await schedulePendingPushes();
  refresh(key);
  return { ok: true };
}
