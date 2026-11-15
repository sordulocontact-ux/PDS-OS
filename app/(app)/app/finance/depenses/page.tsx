import { IconMoneyBillCoin } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { QuickExpenseButton } from "@/components/budget/quick-expense-button";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { SpendsTable } from "@/components/finance/spends-table";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadSpends } from "@/lib/finance/spend-queries";
import {
  rebillMissing,
  spendStage,
  spendTtc,
  type FinanceSpend,
  type SpendStage,
} from "@/lib/finance/spends";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { financeSpends as t } from "@/lib/i18n/fr/finance-spends";
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatAmount } from "@/lib/utils/money";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const amount = (cents: number) => formatAmount(cents, { ht: false });

const VIEWS = [
  "a-payer",
  "engagees",
  "prevues",
  "payees",
  "hors-budget",
  "a-refacturer",
] as const;
type View = (typeof VIEWS)[number];
const asView = (value: unknown): View =>
  VIEWS.find((v) => v === value) ?? "a-payer";

/**
 * Finance › Dépenses (Ibé's ticket, maquette 4, lot 3): every spend of the
 * label, « prévu, engagé, facturé et payé », whatever its envelope
 * (project, artist, cost center, « Hors budget »). The Finance enters the
 * spends of its own envelopes here (« + Dépense », the one spend form) and
 * plans the rebilling of a rebillable spend. Not the team's Dépenses page
 * (/app/expenses), which stays apart.
 */
export default async function FinanceSpendsPage({
  searchParams,
}: PageProps<"/app/finance/depenses">) {
  const today = parisPlace(new Date()).day;
  const [access, params, data, treasury] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
    loadSpends(),
    loadTreasury(today),
  ]);
  const view = asView(params.vue);
  const canManage = can(access, "manage_finance");
  const live = data.spends.filter((s) => !s.refused);
  const of = (stage: SpendStage) =>
    live.filter((s) => spendStage(s.status) === stage);
  const month = today.slice(0, 7);
  const paidThisMonth = of("paid").filter((s) => s.spentOn.startsWith(month));
  const sum = (list: FinanceSpend[]) =>
    list.reduce((total, s) => total + spendTtc(s), 0);
  const lists: Record<View, FinanceSpend[]> = {
    "a-payer": of("invoiced"),
    engagees: of("committed"),
    prevues: of("planned"),
    payees: of("paid"),
    "hors-budget": live.filter((s) => s.target.kind === "off_budget"),
    "a-refacturer": live.filter(rebillMissing),
  };
  const labels: Record<View, string> = {
    "a-payer": t.views.toPay,
    engagees: t.views.committed,
    prevues: t.views.planned,
    payees: t.views.paid,
    "hors-budget": t.views.offBudget,
    "a-refacturer": t.views.rebill,
  };
  const tiles: {
    key: string;
    title: string;
    list: FinanceSpend[];
    view: View;
  }[] = [
    {
      key: "planned",
      title: t.tiles.planned,
      list: of("planned"),
      view: "prevues",
    },
    {
      key: "committed",
      title: t.tiles.committed,
      list: of("committed"),
      view: "engagees",
    },
    {
      key: "invoiced",
      title: t.tiles.invoiced,
      list: of("invoiced"),
      view: "a-payer",
    },
    { key: "paid", title: t.tiles.paid, list: paidThisMonth, view: "payees" },
  ];

  return (
    <FinanceFrame
      section="spends"
      action={canManage ? <QuickExpenseButton /> : undefined}
    >
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {data.spends.length === 0 && !data.error ? (
        <EmptyState
          icon={IconMoneyBillCoin}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((tile) => (
              <MetricCard
                key={tile.key}
                title={tile.title}
                value={amount(sum(tile.list))}
                caption={t.tiles.count(tile.list.length)}
                href={`${routes.financeSpends}?vue=${tile.view}`}
                current={view === tile.view}
              />
            ))}
          </div>
          <DataTableViews
            label={t.views.label}
            views={VIEWS.map((key) => ({
              href: `${routes.financeSpends}?vue=${key}`,
              label: labels[key],
              count: lists[key].length,
              current: view === key,
            }))}
          >
            {lists[view].length === 0 ? (
              <EmptyNote>{t.emptyView}</EmptyNote>
            ) : (
              <SpendsTable
                spends={lists[view]}
                targets={treasury.targets}
                canManage={canManage}
                organizationId={access.organizationId ?? ""}
                ownerId={access.personId}
              />
            )}
          </DataTableViews>
        </>
      )}
    </FinanceFrame>
  );
}
