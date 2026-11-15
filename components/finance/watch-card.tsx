import { LinkRows, type LinkRow } from "@/components/finance/link-rows";
import { MetricCard, MetricCardLink } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { WatchItem } from "@/lib/finance/cockpit";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { OFF_BUDGET_SLUG, spendsHref } from "@/lib/finance/spend-links";

const fr = { treasury: treasuryText };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const day = (value: string) => formatShortDay(value, { bare: true });

/**
 * « À surveiller » (ticket, « Alertes utiles »): where to act, one row
 * each, opening the page where it is done. Same header as every card of
 * Finance, its rows split by hairlines.
 */
export function WatchCard({
  items,
  names,
  canOpenExpenses,
}: {
  items: WatchItem[];
  names: Map<string, string>;
  canOpenExpenses: boolean;
}) {
  const w = fr.treasury.overview.watch;
  const rows = items.map((item): LinkRow => {
    switch (item.kind) {
      case "below_reserve":
        return {
          key: "reserve",
          href: routes.financeTreasury,
          main: w.belowReserve,
          sub: w.belowReserveSub(day(item.day), amount(item.cents)),
          end: <StatusBadge tone="warning">{w.toVerify}</StatusBadge>,
        };
      case "late_income":
        return {
          key: item.id,
          href: `${routes.financeIncomes}?vue=retard`,
          main: w.lateIncome(item.label),
          sub: w.lateIncomeSub(item.days),
          end: (
            <span className="text-body-md font-medium whitespace-nowrap text-[color:var(--error)] tabular-nums">
              {amount(item.cents)}
            </span>
          ),
        };
      case "budget": {
        const title = names.get(item.id) ?? "";
        const over = item.restCents < 0;
        return {
          key: item.id,
          href: routes.financeBudgets,
          main: over
            ? w.budgetOver(title)
            : w.budget(title, Math.round(item.share * 100)),
          sub: over
            ? w.budgetOverSub(amount(-item.restCents))
            : w.budgetSub(amount(item.restCents)),
          end: (
            <StatusBadge tone={over ? "danger" : "warning"}>
              {over ? w.urgent : w.toVerify}
            </StatusBadge>
          ),
        };
      }
      case "off_budget":
        return {
          key: "off-budget",
          href: spendsHref({ enveloppe: OFF_BUDGET_SLUG }),
          main: w.offBudget(item.count),
          sub: w.offBudgetSub(amount(item.cents)),
          end: <StatusBadge tone="warning">{w.toVerify}</StatusBadge>,
        };
      case "rebill":
        return {
          key: "rebill",
          href: spendsHref({ statut: "a-refacturer" }),
          main: w.rebill(item.count),
          sub: w.rebillSub,
          end: <StatusBadge tone="warning">{w.toVerify}</StatusBadge>,
        };
      case "no_proof":
        return {
          key: "proof",
          href: canOpenExpenses
            ? `${routes.expenses}?vue=sans-justificatif`
            : null,
          main: w.noProof(item.count),
          sub: w.noProofSub,
          end: <StatusBadge tone="warning">{w.toVerify}</StatusBadge>,
        };
    }
  });

  return (
    <MetricCard
      title={w.title}
      count={rows.length}
      action={
        <MetricCardLink href={routes.financeAlerts}>{w.all}</MetricCardLink>
      }
    >
      {rows.length === 0 ? (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {w.empty}
        </p>
      ) : (
        <LinkRows rows={rows} />
      )}
    </MetricCard>
  );
}
