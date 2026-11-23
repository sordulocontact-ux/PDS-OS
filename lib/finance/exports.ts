import "server-only";

import { budget } from "@/lib/i18n/fr/budget";
import { financeExports } from "@/lib/i18n/fr/finance-exports";
import { loadBudgets } from "@/lib/finance/budget-queries";
import { htCents, incomeState } from "@/lib/finance/money-in";
import { loadReconciliation } from "@/lib/finance/reconcile-queries";
import { spendTtc } from "@/lib/finance/spends";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { treasury } from "@/lib/i18n/fr/treasury";
import { csv, csvEuros } from "@/lib/utils/csv";

// « Export comptable » (Ibé's ticket, lot 7): Finance's figures as CSV for
// the accountant, who keeps the official accounts. Read with the session:
// nothing without read_finance (RLS and the finance_* functions).

export const EXPORT_TYPES = [
  "depenses",
  "factures",
  "encaissements",
  "banque",
] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

const t = financeExports.columns;

const euros = csvEuros;

export async function financeCsv(
  type: ExportType,
  today: string,
): Promise<string> {
  if (type === "depenses") {
    const data = await loadBudgets();
    const name = new Map(
      data.envelopes.map((e) => [`${e.kind}:${e.id}`, e.name]),
    );
    return csv([
      [
        t.date,
        t.dueOn,
        t.label,
        t.envelopeKind,
        t.envelope,
        t.post,
        t.subpost,
        t.supplier,
        t.status,
        t.ht,
        t.vat,
        t.ttc,
        t.rebillable,
        t.proof,
      ],
      ...data.spends
        .filter((s) => !s.refused)
        .map((s) => [
          s.spentOn,
          s.dueOn,
          s.label,
          budget.form.targetKinds[s.target.kind],
          name.get(`${s.target.kind}:${s.target.id}`) ?? "",
          s.family ? budget.families[s.family] : "",
          s.subpost,
          s.supplier,
          treasury.spendStates[s.status],
          euros(s.cents),
          s.vatBp === null ? "" : euros(s.vatBp),
          euros(spendTtc(s)),
          s.rebillable ? t.yes : "",
          s.hasProof ? t.yes : t.no,
        ]),
    ]);
  }
  const data = await loadTreasury(today);
  if (type === "factures")
    return csv([
      [
        t.number,
        t.issuedOn,
        t.dueOn,
        t.sentOn,
        t.label,
        t.client,
        t.kind,
        t.ht,
        t.ttc,
        t.received,
        t.credited,
        t.state,
      ],
      ...data.incomes.map((i) => [
        i.invoiceNumber,
        i.invoicedOn,
        i.dueOn,
        i.sentOn,
        i.label,
        i.payer,
        treasury.kinds[i.kind],
        euros(htCents(i)),
        euros(i.cents),
        euros(i.receipts.reduce((s, r) => s + r.cents, 0)),
        euros(i.credits.reduce((s, c) => s + c.cents, 0)),
        treasury.states[incomeState(i, today)],
      ]),
      ...data.incomes.flatMap((i) =>
        i.credits.map((c) => [
          c.number,
          c.issuedOn,
          null,
          null,
          `${t.creditNote} · ${i.label}`,
          i.payer,
          t.creditNote,
          null,
          euros(-c.cents),
          null,
          null,
          c.reason,
        ]),
      ),
    ]);
  if (type === "encaissements")
    return csv([
      [t.date, t.label, t.number, t.client, t.amount, t.note],
      ...data.incomes.flatMap((i) =>
        i.receipts.map((r) => [
          r.receivedOn,
          i.label,
          i.invoiceNumber,
          i.payer,
          euros(r.cents),
          r.note,
        ]),
      ),
    ]);
  const bank = await loadReconciliation(data.incomes);
  return csv([
    [t.date, t.counterparty, t.reference, t.amount, t.matched, t.ignored],
    ...bank.transactions.map((x) => [
      x.bookedOn,
      x.counterparty ?? x.label,
      x.reference,
      euros(x.cents),
      x.matches.map((m) => `${m.label} (${euros(m.cents)})`).join(" + "),
      x.ignoreReason,
    ]),
  ]);
}
