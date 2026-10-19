"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { extOf, invoiceError } from "@/lib/legal/invoices/errors";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The direction's gestures on an invoice (J10, proto « Projet complet »):
// add one received otherwise, mark it paid with the day and the proof of
// the transfer. PDS OS never makes a transfer. Rights (« validate ») and
// rules (gap explained, one invoice per contract) are checked in SQL.

type SlotResult = { ok: true; path: string } | { ok: false; error: string };

const id = catalogIdSchema;
const file = z.object({
  path: z.string().min(1).max(400),
  name: z.string().trim().min(1).max(255),
  mime: z.string().max(255),
  bytes: z.number().int().positive().max(20_971_520),
});
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Step 1 of an upload: a one-time path where the browser puts the file. */
export async function openInvoiceTeamSlot(
  needId: string,
  kind: "invoice" | "proof",
  fileName: string,
): Promise<SlotResult> {
  const parsed = id.safeParse(needId);
  await requireApproved();
  if (!parsed.success || (kind !== "invoice" && kind !== "proof"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_legal_invoice_team_slot", {
    p_need_id: parsed.data,
    p_kind: kind,
    p_ext: extOf(fileName),
  });
  if (error || !data) {
    if (error) console.error("openInvoiceTeamSlot:", error.message);
    return { ok: false, error: invoiceError(error?.message) };
  }
  return { ok: true, path: data };
}

const addSchema = z.object({
  projectId: id,
  needId: id,
  file,
  number: z.string().trim().min(1).max(100),
  amountCents: z.number().int().positive().max(99_999_999),
  gapReason: z.string().trim().max(2000),
  receivedOn: day,
});

/** « Ajouter une facture reçue autrement ». */
export async function addInvoice(
  input: z.input<typeof addSchema>,
): Promise<WriteResult> {
  const parsed = addSchema.safeParse(input);
  await requireApproved();
  if (!parsed.success)
    return { ok: false, error: fr.legalInvoices.errors.failed };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_legal_invoice", {
    p_need_id: v.needId,
    p_path: v.file.path,
    p_file_name: v.file.name,
    p_mime: v.file.mime || "application/pdf",
    p_bytes: v.file.bytes,
    p_number: v.number,
    p_amount_cents: v.amountCents,
    p_gap_reason: v.gapReason || null,
    p_received_on: v.receivedOn,
  });
  if (error) {
    console.error("addInvoice:", error.message);
    return { ok: false, error: invoiceError(error.message) };
  }
  await schedulePendingPushes();
  revalidatePath(routes.projectLegal(v.projectId), "layout");
  return { ok: true, done: fr.legalInvoices.added };
}

const paidSchema = z.object({
  projectId: id,
  invoiceId: id,
  paidOn: day,
  proof: file,
});

/** « Marquer comme payée », with the day and the proof of the transfer. */
export async function markInvoicePaid(
  input: z.input<typeof paidSchema>,
): Promise<WriteResult> {
  const parsed = paidSchema.safeParse(input);
  await requireApproved();
  if (!parsed.success)
    return { ok: false, error: fr.legalInvoices.errors.failed };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_legal_invoice_paid", {
    p_invoice_id: v.invoiceId,
    p_paid_on: v.paidOn,
    p_proof_path: v.proof.path,
    p_proof_name: v.proof.name,
  });
  if (error) {
    console.error("markInvoicePaid:", error.message);
    return { ok: false, error: invoiceError(error.message) };
  }
  await schedulePendingPushes();
  revalidatePath(routes.projectLegal(v.projectId), "layout");
  return { ok: true, done: fr.legalInvoices.paidDone };
}
