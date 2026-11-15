import { LinkRows, type LinkRow } from "@/components/finance/link-rows";
import { routes } from "@/lib/auth/redirects";
import type { Alert } from "@/lib/finance/alerts";
import { ENVELOPE_SLUG } from "@/lib/finance/envelope-slugs";
import { spendTtc } from "@/lib/finance/spends";
import { financeAlerts } from "@/lib/i18n/fr/finance-alerts";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { OFF_BUDGET_SLUG, spendsHref } from "@/lib/finance/spend-links";

const fr = { financeAlerts };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const day = (value: string) => formatShortDay(value, { bare: true });

/** One alert as a row: what, its detail, where it is acted on (the page
 * groups by severity: no badge repeats it). */
function rowOf(alert: Alert, index: number): LinkRow {
  const t = fr.financeAlerts;
  const key = `${alert.kind}-${index}`;
  switch (alert.kind) {
    case "below_reserve":
      return {
        key,
        href: routes.financeTreasury,
        main: t.belowReserve,
        sub: t.belowReserveSub(day(alert.day), amount(alert.cents)),
      };
    case "budget": {
      const e = alert.envelope;
      const over = e.engagedCents - (e.currentCents ?? 0);
      return {
        key,
        href: routes.financeBudget(ENVELOPE_SLUG[e.kind], e.id),
        main:
          over > 0
            ? t.budgetOver(e.name, amount(over))
            : t.budget(e.name, Math.round(alert.share * 100)),
        sub: t.budgetSub(amount(e.engagedCents), amount(e.currentCents ?? 0)),
      };
    }
    case "late_income":
      return {
        key,
        href: `${routes.financeIncomes}?vue=retard`,
        main: t.lateIncome(alert.income.label),
        sub: t.lateIncomeSub(alert.days, amount(alert.cents)),
      };
    case "to_pay":
      return {
        key,
        href: spendsHref({ statut: "facture" }),
        main: t.toPay(alert.spend.label),
        sub: t.toPaySub(
          day(alert.day),
          amount(spendTtc(alert.spend)),
          alert.late,
        ),
      };
    case "duplicate_invoice":
      return {
        key,
        href: routes.financeIncomes,
        main: t.duplicateInvoice(alert.label, alert.count),
        sub: t.duplicateInvoiceSub,
      };
    case "duplicate_spend":
      return {
        key,
        href: routes.financeSpends,
        main: t.duplicateSpend(alert.label, alert.count),
        sub: t.duplicateSpendSub,
      };
    case "rebill":
      return {
        key,
        href: spendsHref({ statut: "a-refacturer" }),
        main: t.rebill(alert.spend.label),
        sub: t.rebillSub(amount(spendTtc(alert.spend))),
      };
    case "off_budget":
      return {
        key,
        href: spendsHref({ enveloppe: OFF_BUDGET_SLUG }),
        main: t.offBudget(alert.spend.label),
        sub: t.offBudgetSub(amount(spendTtc(alert.spend))),
      };
    case "no_proof":
      return {
        key,
        href: routes.financeSpends,
        main: t.noProof(alert.count),
        sub: t.noProofSub,
      };
    case "to_reconcile":
      return {
        key,
        href: routes.financeReconcile,
        main: t.toReconcile(alert.count),
        sub: t.toReconcileSub(day(alert.oldest)),
      };
    case "shift":
      return {
        key,
        href: routes.financeFundings,
        main: t.shift(alert.showLabel, day(alert.to)),
        sub: t.shiftSub(amount(alert.gainCents)),
      };
  }
}

/** Alerts as rows (Finance › Alertes, grouped by severity). */
export function AlertsList({ alerts }: { alerts: Alert[] }) {
  return <LinkRows rows={alerts.map(rowOf)} />;
}
