import "server-only";

import { routes } from "@/lib/auth/redirects";
import type { BudgetsData } from "@/lib/finance/budget-queries";
import { ENVELOPE_SLUG } from "@/lib/finance/envelope-slugs";
import { incomeState, type Income } from "@/lib/finance/money-in";
import { spendTtc } from "@/lib/finance/spends";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { financeSearch as t } from "@/lib/i18n/fr/finance-search";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { spendsHref } from "@/lib/finance/spend-links";
import { incomeHref } from "@/lib/finance/income-links";

export type FinanceSearchGroup = "envelope" | "spend" | "income";

export type FinanceSearchItem = {
  id: string;
  group: FinanceSearchGroup;
  label: string;
  detail: string;
  href: string;
};

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * What Finance's ⌘K search finds (docs/FINANCE-V2.md, lot 5): every live
 * envelope, spend and income, each opening its page, a spend or an income
 * in its side sheet (`?ouvrir=`). The sections are listed by the client.
 */
export function financeSearchIndex({
  budgets,
  incomes,
  today,
}: {
  budgets: BudgetsData;
  incomes: Income[];
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
        href: spendsHref({ ouvrir: s.id }),
      })),
    ...incomes.map((i): FinanceSearchItem => {
      return {
        id: `income:${i.id}`,
        group: "income",
        label: i.label,
        detail: t.incomeDetail(amount(i.cents), i.payer, i.invoiceNumber),
        href: incomeHref(i.id, incomeState(i, today)),
      };
    }),
  ];
}
