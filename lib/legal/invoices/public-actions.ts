"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { extOf, invoiceError } from "@/lib/legal/invoices/errors";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// « Envoyer ma facture » from the person's page by project (/c/, lot 11),
// without an account: the database checks the link, the person, the
// project and the signed contract (20261020030301).

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const token = z.string().regex(/^[0-9a-f]{64}$/);
const needId = z.uuid();

/** Step 1: a one-time path where the browser uploads the PDF. */
export async function openContactInvoiceSlot(input: {
  token: string;
  needId: string;
  fileName: string;
}): Promise<Result<{ path: string }>> {
  const v = z
    .object({ token, needId, fileName: z.string().trim().min(1).max(255) })
    .safeParse(input);
  if (!v.success) return { ok: false, error: fr.legalInvoices.errors.failed };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_legal_invoice_slot", {
    p_contact_token: v.data.token,
    p_need_id: v.data.needId,
    p_ext: extOf(v.data.fileName),
  });
  if (error || !data) return { ok: false, error: invoiceError(error?.message) };
  return { ok: true, path: data };
}

/** Step 2: the invoice recorded with its number and amount. */
export async function submitContactInvoice(input: {
  token: string;
  needId: string;
  path: string;
  fileName: string;
  mime: string;
  bytes: number;
  number: string;
  amountCents: number;
  gapReason: string;
}): Promise<Result> {
  const v = z
    .object({
      token,
      needId,
      path: z.string().min(1).max(400),
      fileName: z.string().trim().min(1).max(255),
      mime: z.string().max(255),
      bytes: z.number().int().positive().max(20_971_520),
      number: z.string().trim().min(1).max(100),
      amountCents: z.number().int().positive().max(99_999_999),
      gapReason: z.string().trim().max(2000),
    })
    .safeParse(input);
  if (!v.success) return { ok: false, error: fr.legalInvoices.errors.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_legal_invoice", {
    p_contact_token: v.data.token,
    p_need_id: v.data.needId,
    p_path: v.data.path,
    p_file_name: v.data.fileName,
    p_mime: v.data.mime || "application/pdf",
    p_bytes: v.data.bytes,
    p_number: v.data.number,
    p_amount_cents: v.data.amountCents,
    p_gap_reason: v.data.gapReason || null,
  });
  if (error) return { ok: false, error: invoiceError(error.message) };
  await schedulePendingPushes();
  revalidatePath(`/c/${v.data.token}`);
  return { ok: true };
}
