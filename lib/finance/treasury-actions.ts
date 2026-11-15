"use server";

import { z } from "zod";

import { INCOME_KINDS, VAT_RATES } from "@/lib/finance/money-in";
import {
  cents,
  failure,
  fileInput,
  optionalDay,
  optionalId,
  optionalText,
  organization,
  positiveEuros,
  refresh,
} from "@/lib/finance/write-helpers";
import { treasury } from "@/lib/i18n/fr/treasury";
import { requireApproved } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { parisPlace } from "@/lib/utils/calendar-period";
import type { WriteResult } from "@/lib/utils/write-result";

const t = treasury.errors;

// Writes of the treasury and the money in: with the user's session, the
// rules in SQL (manage_finance, receipts within their income, an income
// with receipts never cancelled: 20261113100101_treasury.sql, its invoice:
// 20261113200102_client_invoices.sql).

// The account's balance on a day, as the bank shows it: may be negative.
const statementInput = z.object({
  amount: z.string().transform((value, ctx) => {
    const negative = value.trim().startsWith("-");
    const parsed = cents(value.trim().replace(/^-/, ""));
    if (parsed === null) {
      ctx.addIssue({ code: "custom" });
      return z.NEVER;
    }
    return negative ? -parsed : parsed;
  }),
  asOf: z.iso.date(),
  note: optionalText(500),
});
export type StatementInput = z.input<typeof statementInput>;

export async function saveStatement(
  input: StatementInput,
): Promise<WriteResult> {
  const organizationId = await organization();
  const p = statementInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  if (p.data.asOf > parisPlace(new Date()).day)
    return { ok: false, error: treasury.statementForm.errors.future };
  const supabase = await createClient();
  const { error } = await supabase.from("treasury_balances").insert({
    organization_id: organizationId,
    balance_cents: p.data.amount,
    as_of: p.data.asOf,
    note: p.data.note,
  });
  if (error) return failure(error, "saveStatement");
  refresh();
  return { ok: true, done: treasury.statementForm.done };
}

const reserveInput = z.object({
  amount: z.string().transform((value, ctx) => {
    const parsed = value.trim() === "" ? 0 : cents(value);
    if (parsed === null) {
      ctx.addIssue({ code: "custom" });
      return z.NEVER;
    }
    return parsed;
  }),
});

export async function saveReserve(input: {
  amount: string;
}): Promise<WriteResult> {
  const organizationId = await organization();
  const p = reserveInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase
    .from("treasury_settings")
    .upsert(
      { organization_id: organizationId, reserve_cents: p.data.amount },
      { onConflict: "organization_id" },
    );
  if (error) return failure(error, "saveReserve");
  refresh();
  return { ok: true, done: treasury.reserveForm.done };
}

const incomeInput = (organizationId: string) =>
  z
    .object({
      id: z.uuid().optional(),
      // The spend this income rebills (lot 3), on a new income only.
      sourceLineId: z.uuid().optional(),
      label: z.string().trim().min(1).max(200),
      kind: z.enum(INCOME_KINDS),
      amount: positiveEuros,
      vatBp: z
        .number()
        .int()
        .nullable()
        .refine(
          (v) => v === null || (VAT_RATES as readonly number[]).includes(v),
        ),
      contactId: optionalId,
      payerName: optionalText(200),
      projectId: optionalId,
      artistId: optionalId,
      dealId: optionalId,
      ownerId: optionalId,
      expectedOn: z.iso.date(),
      invoiceNumber: optionalText(100),
      invoicedOn: optionalDay,
      dueOn: optionalDay,
      sentOn: optionalDay,
      // undefined: the kept file stays; null: none.
      file: fileInput(organizationId),
      note: optionalText(1000),
    })
    .refine((v) => (v.invoiceNumber === null) === (v.invoicedOn === null))
    .refine((v) => !v.dueOn || !v.invoicedOn || v.dueOn >= v.invoicedOn)
    .refine(
      (v) => !v.sentOn || (v.invoicedOn !== null && v.sentOn >= v.invoicedOn),
    );
export type IncomeInput = z.input<ReturnType<typeof incomeInput>>;

/** Enters an income, or changes one (the amount never under what it
 * received). */
export async function saveIncome(input: IncomeInput): Promise<WriteResult> {
  const organizationId = await organization();
  if (!organizationId) return { ok: false, error: t.invalid };
  const p = incomeInput(organizationId).safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid };
  const { id, sourceLineId, ...v } = p.data;
  const row = {
    label: v.label,
    kind: v.kind,
    amount_cents: v.amount,
    contact_id: v.contactId,
    // A name only when no contact is linked (PersonPickerField).
    payer_name: v.contactId ? null : v.payerName,
    project_id: v.projectId,
    artist_id: v.artistId,
    deal_id: v.dealId,
    owner_person_id: v.ownerId,
    vat_bp: v.vatBp,
    expected_on: v.expectedOn,
    invoice_number: v.invoiceNumber,
    invoiced_on: v.invoicedOn,
    due_on: v.dueOn,
    sent_on: v.sentOn,
    ...(v.file !== undefined
      ? { file_path: v.file?.path ?? null, file_name: v.file?.name ?? null }
      : {}),
    note: v.note,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("finance_incomes").update(row).eq("id", id)
    : await supabase.from("finance_incomes").insert({
        ...row,
        organization_id: organizationId,
        source_line_id: sourceLineId ?? null,
      });
  if (error) return failure(error, "saveIncome");
  refresh();
  const done = treasury.incomeForm.done;
  return { ok: true, done: id ? done.changed : done.created };
}

const receiptInput = z.object({
  incomeId: z.uuid(),
  amount: positiveEuros,
  receivedOn: z.iso.date(),
  note: optionalText(500),
});
export type ReceiptInput = z.input<typeof receiptInput>;

export async function addReceipt(input: ReceiptInput): Promise<WriteResult> {
  const organizationId = await organization();
  const p = receiptInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_receipts").insert({
    organization_id: organizationId,
    income_id: p.data.incomeId,
    amount_cents: p.data.amount,
    received_on: p.data.receivedOn,
    note: p.data.note,
  });
  if (error) return failure(error, "addReceipt");
  refresh();
  return { ok: true, done: treasury.receiptForm.done };
}

export async function removeReceipt(receiptId: string): Promise<WriteResult> {
  await requireApproved();
  const id = z.uuid().safeParse(receiptId);
  if (!id.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_receipts")
    .delete()
    .eq("id", id.data)
    .select("id");
  if (error) return failure(error, "removeReceipt");
  if (!data?.length) return { ok: false, error: t.forbidden };
  refresh();
  return { ok: true, done: treasury.receiptForm.removed };
}

const cancelInput = z.object({
  incomeId: z.uuid(),
  reason: z.string().trim().min(1).max(1000),
});

export async function cancelIncome(input: {
  incomeId: string;
  reason: string;
}): Promise<WriteResult> {
  await requireApproved();
  const p = cancelInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_incomes")
    .update({
      cancelled_at: new Date().toISOString(),
      cancel_reason: p.data.reason,
    })
    .eq("id", p.data.incomeId)
    .select("id");
  if (error) return failure(error, "cancelIncome");
  if (!data?.length) return { ok: false, error: t.forbidden };
  refresh();
  return { ok: true, done: treasury.cancelForm.done };
}
