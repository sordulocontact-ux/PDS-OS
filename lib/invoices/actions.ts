"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

import { invoiceError } from "./errors";
import { extOf } from "./rules";

// The team's side of an invoice (one system, 20/10/2026), with the session:
// an invoice received otherwise (the owner or the direction), the new RIB
// confirmed after a phone call and the invoice marked paid (the direction).
// The database decides who may; PDS OS never makes the transfer.

const id = z.uuid();
const t = fr.invoices.team;
const failed = fr.invoices.errors.failed;

// Every page of the project reads the invoices (Master final, Juridique,
// Budget): the project's layout is refreshed.
const refresh = (projectId: string) =>
  revalidatePath(routes.project(projectId), "layout");

type Slot = { ok: true; path: string } | { ok: false; error: string };

async function openSlot(
  invoiceId: string,
  kind: "invoice" | "proof",
  ext: string,
): Promise<Slot> {
  if (!id.safeParse(invoiceId).success) return { ok: false, error: failed };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_invoice_slot", {
    p_invoice_id: invoiceId,
    p_kind: kind,
    p_ext: ext,
  });
  if (error || !data) {
    if (error) console.error("openInvoiceSlot:", error.message);
    return { ok: false, error: invoiceError(error?.message, error?.code) };
  }
  return { ok: true, path: data };
}

/** A one-time path for the PDF of an invoice received otherwise. */
export async function openTeamInvoiceSlot(invoiceId: string): Promise<Slot> {
  return openSlot(invoiceId, "invoice", "pdf");
}

/** A one-time path for the proof of the transfer (PDF, PNG, JPG). */
export async function openProofSlot(
  invoiceId: string,
  fileName: string,
): Promise<Slot> {
  return openSlot(invoiceId, "proof", extOf(fileName));
}

const received = z.object({
  path: z.string().min(1).max(400),
  fileName: z.string().trim().min(1).max(255),
  number: z.string().trim().min(1).max(100),
  amountCents: z.number().int().min(1).max(100_000_000),
  reason: z.string().trim().max(2000).nullable(),
  receivedOn: z.iso.date(),
  iban: z.string().trim().max(50).nullable(),
  bic: z.string().trim().max(20).nullable(),
  holder: z.string().trim().max(200).nullable(),
});

/** « Ajouter la facture »: received by e-mail, by hand… */
export async function addReceivedInvoice(
  projectId: string,
  invoiceId: string,
  input: z.input<typeof received>,
): Promise<WriteResult> {
  const v = received.safeParse(input);
  if (!id.safeParse(projectId).success || !id.safeParse(invoiceId).success)
    return { ok: false, error: failed };
  if (!v.success) return { ok: false, error: failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_received_invoice", {
    p_invoice_id: invoiceId,
    p_path: v.data.path,
    p_file_name: v.data.fileName,
    p_mime: "application/pdf",
    p_number: v.data.number,
    p_amount_cents: v.data.amountCents,
    p_reason: v.data.reason || null,
    p_received_on: v.data.receivedOn,
    p_how: null,
    p_iban: v.data.iban || null,
    p_bic: v.data.bic || null,
    p_holder: v.data.holder || null,
  });
  if (error) {
    console.error("addReceivedInvoice:", error.message);
    return { ok: false, error: invoiceError(error.message, error.code) };
  }
  await schedulePendingPushes();
  refresh(projectId);
  return { ok: true, done: t.added };
}

/** « Confirmer le nouveau RIB »: the direction called the person. */
export async function confirmBankAccount(
  projectId: string,
  accountId: string,
  phoneChecked: boolean,
): Promise<WriteResult> {
  if (!id.safeParse(projectId).success || !id.safeParse(accountId).success)
    return { ok: false, error: failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_contact_bank_account", {
    p_account_id: accountId,
    p_phone_checked: phoneChecked,
  });
  if (error) {
    console.error("confirmBankAccount:", error.message);
    return { ok: false, error: invoiceError(error.message, error.code) };
  }
  refresh(projectId);
  return { ok: true, done: t.confirmed };
}

const pay = z.object({
  paidOn: z.iso.date(),
  path: z.string().min(1).max(400),
  fileName: z.string().trim().min(1).max(255),
  mime: z.enum(["application/pdf", "image/png", "image/jpeg"]),
});

/** « Marquer comme payée »: the transfer made from PDS's bank, noted. */
export async function payInvoice(
  projectId: string,
  invoiceId: string,
  input: z.input<typeof pay>,
): Promise<WriteResult> {
  const v = pay.safeParse(input);
  if (!id.safeParse(projectId).success || !id.safeParse(invoiceId).success)
    return { ok: false, error: failed };
  if (!v.success) return { ok: false, error: fr.invoices.errors.invalid_date };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_invoice", {
    p_invoice_id: invoiceId,
    p_paid_on: v.data.paidOn,
    p_path: v.data.path,
    p_file_name: v.data.fileName,
    p_mime: v.data.mime,
  });
  if (error) {
    console.error("payInvoice:", error.message);
    return { ok: false, error: invoiceError(error.message, error.code) };
  }
  await schedulePendingPushes();
  refresh(projectId);
  return { ok: true, done: t.paid };
}
