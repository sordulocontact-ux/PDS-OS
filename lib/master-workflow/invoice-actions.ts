"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The team's side of the engineer's invoice (docs/projet-complet/master.md
// § 9), with the session: an invoice received another way (the owner),
// the new RIB confirmed after a phone call and the invoice marked paid
// (the direction). The database decides who may (is_project_owner,
// is_direction); PDS OS never makes the transfer.

const id = z.uuid();
const te = fr.masterInvoice.team.errors;
const fe = fr.masterInvoice.fields.errors;

function errorOf(message: string | undefined, code: string | undefined) {
  if (code === "42501") return te.forbidden;
  const all = { ...fe, ...te } as Record<string, string>;
  const known = Object.keys(all).find((c) => message?.includes(c));
  return known ? all[known] : te.failed;
}

const refresh = (projectId: string) =>
  revalidatePath(routes.project(projectId), "layout");

type Slot = { ok: true; path: string } | { ok: false; error: string };

async function openSlot(
  invoiceId: string,
  kind: "invoice" | "proof",
  ext: string,
): Promise<Slot> {
  if (!id.safeParse(invoiceId).success) return { ok: false, error: te.failed };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_master_finance_slot", {
    p_invoice_id: invoiceId,
    p_kind: kind,
    p_ext: ext,
  });
  if (error || !data) {
    if (error) console.error("openSlot:", error.message);
    return { ok: false, error: errorOf(error?.message, error?.code) };
  }
  return { ok: true, path: data };
}

/** A one-time path for the PDF of an invoice received another way. */
export async function openTeamInvoiceSlot(invoiceId: string): Promise<Slot> {
  return openSlot(invoiceId, "invoice", "pdf");
}

/** A one-time path for the proof of the transfer (PDF, PNG, JPG). */
export async function openProofSlot(
  invoiceId: string,
  fileName: string,
): Promise<Slot> {
  const ext = /\.([a-z0-9]{1,5})$/i.exec(fileName)?.[1]?.toLowerCase() ?? "";
  return openSlot(invoiceId, "proof", ext);
}

const other = z.object({
  path: z.string().min(1).max(300),
  fileName: z.string().trim().min(1).max(255),
  number: z.string().trim().min(1).max(60),
  amountCents: z.number().int().min(1).max(100_000_000),
  reason: z.string().trim().max(1000).nullable(),
  iban: z.string().trim().max(50).nullable(),
  bic: z.string().trim().max(20).nullable(),
  holder: z.string().trim().max(200).nullable(),
});

/** « Ajouter la facture »: received by e-mail, by hand…, by the owner. */
export async function recordInvoiceOther(
  projectId: string,
  invoiceId: string,
  input: z.input<typeof other>,
): Promise<WriteResult> {
  const v = other.safeParse(input);
  if (!id.safeParse(projectId).success || !id.safeParse(invoiceId).success)
    return { ok: false, error: te.failed };
  if (!v.success) return { ok: false, error: fe.failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_master_invoice_other", {
    p_invoice_id: invoiceId,
    p_path: v.data.path,
    p_file_name: v.data.fileName,
    p_mime: "application/pdf",
    p_number: v.data.number,
    p_amount_cents: v.data.amountCents,
    p_reason: v.data.reason || null,
    p_how: null,
    p_iban: v.data.iban || null,
    p_bic: v.data.bic || null,
    p_holder: v.data.holder || null,
  });
  if (error) {
    console.error("recordInvoiceOther:", error.message);
    return { ok: false, error: errorOf(error.message, error.code) };
  }
  refresh(projectId);
  return { ok: true, done: fr.masterInvoice.team.added };
}

/** « Confirmer le nouveau RIB »: the direction called the engineer. */
export async function confirmBankAccount(
  projectId: string,
  accountId: string,
  phoneChecked: boolean,
): Promise<WriteResult> {
  if (!id.safeParse(projectId).success || !id.safeParse(accountId).success)
    return { ok: false, error: te.failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_contact_bank_account", {
    p_account_id: accountId,
    p_phone_checked: phoneChecked,
  });
  if (error) {
    console.error("confirmBankAccount:", error.message);
    return { ok: false, error: errorOf(error.message, error.code) };
  }
  refresh(projectId);
  return { ok: true, done: fr.masterInvoice.team.confirmed };
}

const pay = z.object({
  paidOn: z.iso.date(),
  path: z.string().min(1).max(300),
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
    return { ok: false, error: te.failed };
  if (!v.success) return { ok: false, error: te.invalid_date };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_master_invoice", {
    p_invoice_id: invoiceId,
    p_paid_on: v.data.paidOn,
    p_path: v.data.path,
    p_file_name: v.data.fileName,
    p_mime: v.data.mime,
  });
  if (error) {
    console.error("payInvoice:", error.message);
    return { ok: false, error: errorOf(error.message, error.code) };
  }
  refresh(projectId);
  return { ok: true, done: fr.masterInvoice.team.paid };
}
