import "server-only";

import { remainingCents, type Income } from "@/lib/finance/money-in";
import type { BankTransaction, Candidate } from "@/lib/finance/reconcile";
import { createClient } from "@/lib/supabase/server";

/**
 * The bank transactions with what each settles (receipts, spend matches),
 * and every candidate: the open incomes given, the spends not matched in
 * full (finance_match_candidates). Read with the session (read_finance).
 */
export async function loadReconciliation(incomes: Income[]): Promise<{
  transactions: BankTransaction[];
  candidates: Candidate[];
  error: boolean;
}> {
  const supabase = await createClient();
  const [transactions, spends] = await Promise.all([
    supabase
      .from("finance_bank_transactions")
      .select(
        "id, booked_on, amount_cents, counterparty, reference, label, source, ignore_reason, receipts:finance_receipts(id, income_id, amount_cents), matches:finance_spend_matches(id, line_id, amount_cents, line:budget_lines(label))",
      )
      .order("booked_on", { ascending: false })
      .limit(1000),
    supabase.rpc("finance_match_candidates"),
  ]);
  for (const [name, result] of Object.entries({ transactions, spends }))
    if (result.error)
      console.error(`loadReconciliation (${name}):`, result.error.message);
  const incomeOf = new Map(incomes.map((i) => [i.id, i]));
  const spendLabel = new Map(
    (spends.data ?? []).map((s) => [s.line_id, s.label] as const),
  );
  return {
    transactions: (transactions.data ?? []).map((t) => ({
      id: t.id,
      bookedOn: t.booked_on,
      cents: Number(t.amount_cents),
      counterparty: t.counterparty,
      reference: t.reference,
      label: t.label,
      source: t.source === "csv" ? "csv" : "manual",
      ignoreReason: t.ignore_reason,
      matches: [
        ...(t.receipts ?? []).map((r) => ({
          id: r.id,
          kind: "income" as const,
          targetId: r.income_id,
          label: incomeOf.get(r.income_id)?.label ?? "",
          cents: Number(r.amount_cents),
        })),
        ...(t.matches ?? []).map((m) => ({
          id: m.id,
          kind: "spend" as const,
          targetId: m.line_id,
          label: m.line?.label ?? spendLabel.get(m.line_id) ?? "",
          cents: Number(m.amount_cents),
        })),
      ],
    })),
    candidates: [
      ...incomes
        .filter((i) => remainingCents(i) > 0)
        .map((i): Candidate => ({
          kind: "income",
          id: i.id,
          label: i.label,
          leftCents: remainingCents(i),
          day: i.dueOn ?? i.expectedOn,
          party: i.payer,
          reference: i.invoiceNumber,
        })),
      ...(spends.data ?? []).map((s): Candidate => ({
        kind: "spend",
        id: s.line_id,
        label: s.label,
        leftCents: Number(s.left_cents),
        day: s.day,
        party: s.supplier,
        reference: s.invoice_number,
      })),
    ],
    error: Boolean(transactions.error || spends.error),
  };
}
