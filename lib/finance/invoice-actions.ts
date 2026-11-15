"use server";

import { z } from "zod";

import { REMINDER_CHANNELS } from "@/lib/finance/money-in";
import {
  failure,
  fileInput,
  optionalDay,
  optionalText,
  organization,
  positiveEuros,
  refresh,
} from "@/lib/finance/write-helpers";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";
import { treasury } from "@/lib/i18n/fr/treasury";
import { createClient } from "@/lib/supabase/server";
import { parisPlace } from "@/lib/utils/calendar-period";
import type { WriteResult } from "@/lib/utils/write-result";

const t = treasury.errors;
const done = clientInvoices.done;

// The life of a client invoice after its entry: sent, chased, corrected by
// a credit note. With the user's session; the rules in SQL
// (20261113200102_client_invoices.sql). Nothing is sent to the client from
// here: a reminder is entered once made (« aucune relance […] n'est
// envoyée automatiquement sans validation », Ibé's ticket).

/** « Marquer envoyée »: the invoice left today (or on its day, when it is
 * dated later). */
export async function markInvoiceSent(incomeId: string): Promise<WriteResult> {
  await organization();
  const id = z.uuid().safeParse(incomeId);
  if (!id.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data: income, error: readError } = await supabase
    .from("finance_incomes")
    .select("invoiced_on")
    .eq("id", id.data)
    .maybeSingle();
  if (readError) return failure(readError, "markInvoiceSent");
  if (!income?.invoiced_on) return { ok: false, error: t.invalid };
  const today = parisPlace(new Date()).day;
  const { data, error } = await supabase
    .from("finance_incomes")
    .update({
      sent_on: income.invoiced_on > today ? income.invoiced_on : today,
    })
    .eq("id", id.data)
    .select("id");
  if (error) return failure(error, "markInvoiceSent");
  if (!data?.length) return { ok: false, error: t.forbidden };
  refresh();
  return { ok: true, done: done.sent };
}

const reminderInput = z.object({
  incomeId: z.uuid(),
  remindedOn: z.iso.date(),
  channel: z.enum(REMINDER_CHANNELS),
  note: optionalText(500),
  nextAction: optionalText(300),
  nextActionOn: optionalDay,
});
export type ReminderInput = z.input<typeof reminderInput>;

/** A reminder made, and what comes next (« prochaine action »). */
export async function addReminder(input: ReminderInput): Promise<WriteResult> {
  const organizationId = await organization();
  const p = reminderInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  if (p.data.remindedOn > parisPlace(new Date()).day)
    return { ok: false, error: clientInvoices.reminderForm.errors.future };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_reminders").insert({
    organization_id: organizationId,
    income_id: p.data.incomeId,
    reminded_on: p.data.remindedOn,
    channel: p.data.channel,
    note: p.data.note,
  });
  if (error) return failure(error, "addReminder");
  const { error: nextError } = await supabase
    .from("finance_incomes")
    .update({
      next_action: p.data.nextAction,
      next_action_on: p.data.nextAction ? p.data.nextActionOn : null,
    })
    .eq("id", p.data.incomeId);
  if (nextError) return failure(nextError, "addReminder (next)");
  refresh();
  return { ok: true, done: done.reminder };
}

export async function removeReminder(reminderId: string): Promise<WriteResult> {
  await organization();
  const id = z.uuid().safeParse(reminderId);
  if (!id.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_reminders")
    .delete()
    .eq("id", id.data)
    .select("id");
  if (error) return failure(error, "removeReminder");
  if (!data?.length) return { ok: false, error: t.forbidden };
  refresh();
  return { ok: true, done: done.reminderRemoved };
}

const creditInput = (organizationId: string) =>
  z.object({
    incomeId: z.uuid(),
    number: z.string().trim().min(1).max(100),
    issuedOn: z.iso.date(),
    amount: positiveEuros,
    reason: z.string().trim().min(1).max(1000),
    file: fileInput(organizationId),
  });
export type CreditInput = z.input<ReturnType<typeof creditInput>>;

/** « Émettre un avoir »: corrects the invoice for a part not received. */
export async function addCreditNote(input: CreditInput): Promise<WriteResult> {
  const organizationId = await organization();
  if (!organizationId) return { ok: false, error: t.invalid };
  const p = creditInput(organizationId).safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_credit_notes").insert({
    organization_id: organizationId,
    income_id: p.data.incomeId,
    number: p.data.number,
    issued_on: p.data.issuedOn,
    amount_cents: p.data.amount,
    reason: p.data.reason,
    file_path: p.data.file?.path ?? null,
    file_name: p.data.file?.name ?? null,
  });
  if (error) return failure(error, "addCreditNote");
  refresh();
  return { ok: true, done: done.credit };
}
