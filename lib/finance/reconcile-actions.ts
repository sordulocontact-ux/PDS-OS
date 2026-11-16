"use server";

import { z } from "zod";

import {
  failure,
  optionalText,
  organization,
  positiveEuros,
  refresh,
} from "@/lib/finance/write-helpers";
import { reconcile } from "@/lib/i18n/fr/reconcile";
import { treasury } from "@/lib/i18n/fr/treasury";
import { createClient } from "@/lib/supabase/server";
import { parisPlace } from "@/lib/utils/calendar-period";
import type { WriteResult } from "@/lib/utils/write-result";

const t = treasury.errors;
const done = reconcile.done;

// Finance › Rapprochement (lot 6): the bank's transactions and what a
// person reconciles them with; the rules in SQL
// (20261113600101_finance_reconciliation.sql).

const rowInput = z.object({
  bookedOn: z.iso.date(),
  cents: z
    .number()
    .int()
    .refine((v) => v !== 0 && Math.abs(v) <= 100000000000),
  counterparty: z.string().max(200).nullable(),
  reference: z.string().max(300).nullable(),
  label: z.string().max(300).nullable(),
  externalId: z.string().max(120).nullable(),
});

/** « Importer un relevé »: the rows read from the bank's CSV; a row
 * already imported (same transaction id) is skipped, never doubled. */
export async function importTransactions(input: {
  rows: z.input<typeof rowInput>[];
}): Promise<WriteResult> {
  const organizationId = await organization();
  const p = z.array(rowInput).min(1).max(2000).safeParse(input.rows);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const withId = p.data.filter((r) => r.externalId);
  const { data: known } = withId.length
    ? await supabase
        .from("finance_bank_transactions")
        .select("external_id")
        .in(
          "external_id",
          withId.map((r) => r.externalId ?? ""),
        )
    : { data: [] };
  const skip = new Set((known ?? []).map((k) => k.external_id));
  const fresh = p.data.filter((r) => !r.externalId || !skip.has(r.externalId));
  if (fresh.length) {
    const { error } = await supabase.from("finance_bank_transactions").insert(
      fresh.map((r) => ({
        organization_id: organizationId,
        booked_on: r.bookedOn,
        amount_cents: r.cents,
        counterparty: r.counterparty,
        reference: r.reference,
        label: r.label,
        external_id: r.externalId,
        source: "csv",
      })),
    );
    if (error) return failure(error, "importTransactions");
  }
  refresh();
  return {
    ok: true,
    done: done.imported(fresh.length, p.data.length - fresh.length),
  };
}

const manualInput = z.object({
  bookedOn: z.iso.date(),
  amount: positiveEuros,
  direction: z.enum(["in", "out"]),
  counterparty: optionalText(200),
  reference: optionalText(300),
});

/** « Ajouter une transaction » by hand. */
export async function addTransaction(
  input: z.input<typeof manualInput>,
): Promise<WriteResult> {
  const organizationId = await organization();
  const p = manualInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  if (p.data.bookedOn > parisPlace(new Date()).day)
    return { ok: false, error: reconcile.manualForm.errors.future };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_bank_transactions").insert({
    organization_id: organizationId,
    booked_on: p.data.bookedOn,
    amount_cents: p.data.direction === "in" ? p.data.amount : -p.data.amount,
    counterparty: p.data.counterparty,
    reference: p.data.reference,
    source: "manual",
  });
  if (error) return failure(error, "addTransaction");
  refresh();
  return { ok: true, done: done.added };
}

const matchInput = z.object({
  transactionId: z.uuid(),
  kind: z.enum(["income", "spend"]),
  targetId: z.uuid(),
  amount: positiveEuros,
});

/** « Rapprocher »: a credit becomes the income's receipt, a debit is
 * matched with the spend; never a second income nor spend. */
export async function matchTransaction(
  input: z.input<typeof matchInput>,
): Promise<WriteResult> {
  const organizationId = await organization();
  const p = matchInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data: tx } = await supabase
    .from("finance_bank_transactions")
    .select("booked_on, counterparty, reference")
    .eq("id", p.data.transactionId)
    .maybeSingle();
  if (!tx) return { ok: false, error: t.forbidden };
  const { error } =
    p.data.kind === "income"
      ? await supabase.from("finance_receipts").insert({
          organization_id: organizationId,
          income_id: p.data.targetId,
          amount_cents: p.data.amount,
          received_on: tx.booked_on,
          transaction_id: p.data.transactionId,
          note: reconcile.receiptNote(tx.counterparty ?? tx.reference),
        })
      : await supabase.from("finance_spend_matches").insert({
          organization_id: organizationId,
          transaction_id: p.data.transactionId,
          line_id: p.data.targetId,
          amount_cents: p.data.amount,
        });
  if (error) return failure(error, "matchTransaction");
  refresh();
  return { ok: true, done: done.matched };
}

const undoInput = z.object({ kind: z.enum(["income", "spend"]), id: z.uuid() });

/** Undoes a match (the receipt it made goes with it; the history keeps
 * both). */
export async function unmatch(
  input: z.input<typeof undoInput>,
): Promise<WriteResult> {
  await organization();
  const p = undoInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(
      p.data.kind === "income" ? "finance_receipts" : "finance_spend_matches",
    )
    .delete()
    .eq("id", p.data.id)
    .select("id");
  if (error) return failure(error, "unmatch");
  if (!data?.length) return { ok: false, error: t.forbidden };
  refresh();
  return { ok: true, done: done.unmatched };
}

const ignoreInput = z.object({
  id: z.uuid(),
  reason: z.string().trim().max(300).nullable(),
});

/** « Ignorer » (bank fees, a transfer between accounts…), with its reason;
 * or put back to reconcile (reason null). */
export async function setTransactionIgnored(
  input: z.input<typeof ignoreInput>,
): Promise<WriteResult> {
  await organization();
  const p = ignoreInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_bank_transactions")
    .update(
      p.data.reason
        ? { ignored_at: new Date().toISOString(), ignore_reason: p.data.reason }
        : { ignored_at: null, ignore_reason: null },
    )
    .eq("id", p.data.id)
    .select("id");
  if (error) return failure(error, "setTransactionIgnored");
  if (!data?.length) return { ok: false, error: t.forbidden };
  refresh();
  return { ok: true, done: p.data.reason ? done.ignored : done.restored };
}
