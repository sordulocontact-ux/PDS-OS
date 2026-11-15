import "server-only";

import { routes } from "@/lib/auth/redirects";
import type { BudgetsData } from "@/lib/finance/budget-queries";
import { ENVELOPE_SLUG } from "@/lib/finance/envelope-slugs";
import { incomeState, type Income } from "@/lib/finance/money-in";
import { txState, type BankTransaction } from "@/lib/finance/reconcile";
import { spendTtc } from "@/lib/finance/spends";
import type { ProofIndexRow } from "@/lib/finance/proof-queries";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { financeSearch as t } from "@/lib/i18n/fr/finance-search";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { spendsHref } from "@/lib/finance/spend-links";
import { incomeHref } from "@/lib/finance/income-links";

export type FinanceSearchGroup =
  "envelope" | "spend" | "income" | "proof" | "transaction";

export type FinanceSearchItem = {
  id: string;
  group: FinanceSearchGroup;
  label: string;
  detail: string;
  // Searched but not shown: the amount as one types it (« 1500 »).
  keywords?: string;
  href: string;
};

/** « 350,00 350 »: an amount as one would type it, to be found by it. */
const typed = (cents: number) => {
  const euros = Math.abs(cents) / 100;
  return `${euros.toFixed(2).replace(".", ",")} ${Number.isInteger(euros) ? euros : ""}`.trim();
};

// The Rapprochement view that lists an operation, its sheet open.
const TX_VIEW = {
  open: "a-rapprocher",
  partial: "a-rapprocher",
  matched: "rapprochees",
  ignored: "ignorees",
} as const;

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * What Finance's ⌘K search finds (docs/FINANCE-V2.md, lot 5): every live
 * budget, spend, income, proof and bank operation, each opening its page, a
 * spend, an income or an operation in its side sheet (`?ouvrir=`), a proof
 * attached to a spend in that spend's. The sections are listed by the
 * client.
 */
export function financeSearchIndex({
  budgets,
  incomes,
  proofs,
  transactions,
  today,
}: {
  budgets: BudgetsData;
  incomes: Income[];
  proofs: ProofIndexRow[];
  transactions: BankTransaction[];
  today: string;
}): FinanceSearchItem[] {
  const envelopes = budgets.envelopes.filter((e) => !e.archived);
  const nameOf = new Map(envelopes.map((e) => [e.id, e.name]));
  return [
    ...envelopes.map((e): FinanceSearchItem => ({
      id: `envelope:${e.id}`,
      group: "envelope",
      label: e.name,
      detail: [
        financeBudgets.kindOne[e.kind],
        e.currentCents === null ? null : amount(e.currentCents),
      ]
        .filter(Boolean)
        .join(" · "),
      href: routes.financeBudget(ENVELOPE_SLUG[e.kind], e.id),
    })),
    ...budgets.spends
      .filter((s) => !s.refused)
      .map((s): FinanceSearchItem => ({
        id: `spend:${s.id}`,
        group: "spend",
        label: s.label,
        detail: t.spendDetail(
          amount(spendTtc(s)),
          s.target.kind === "off_budget"
            ? t.offBudget
            : (nameOf.get(s.target.id) ?? t.offBudget),
          formatDay(s.spentOn, { weekday: false }),
        ),
        keywords: typed(spendTtc(s)),
        href: spendsHref({ ouvrir: s.id }),
      })),
    ...incomes.map((i): FinanceSearchItem => {
      return {
        id: `income:${i.id}`,
        group: "income",
        label: i.label,
        detail: t.incomeDetail(amount(i.cents), i.payer, i.invoiceNumber),
        keywords: typed(i.cents),
        href: incomeHref(i.id, incomeState(i, today)),
      };
    }),
    ...proofs
      .filter((p) => !p.dismissed)
      .map((p): FinanceSearchItem => ({
        id: `proof:${p.id}`,
        group: "proof",
        label: p.vendor ?? p.fileName,
        detail: t.proofDetail(
          p.amountCents === null ? null : amount(p.amountCents),
          p.reference,
          p.vendor ? p.fileName : null,
        ),
        keywords: p.amountCents === null ? undefined : typed(p.amountCents),
        href: p.lineId
          ? spendsHref({ ouvrir: p.lineId })
          : `${routes.financeReceipts}?ouvrir=${p.id}`,
      })),
    ...transactions.map((x): FinanceSearchItem => ({
      id: `transaction:${x.id}`,
      group: "transaction",
      label: x.counterparty ?? x.label ?? x.reference ?? amount(x.cents),
      detail: t.transactionDetail(
        amount(x.cents),
        formatDay(x.bookedOn, { weekday: false }),
      ),
      keywords: `${typed(x.cents)} ${x.label ?? ""} ${x.reference ?? ""}`,
      href: `${routes.financeReconcile}?vue=${TX_VIEW[txState(x)]}&ouvrir=${x.id}`,
    })),
  ];
}
