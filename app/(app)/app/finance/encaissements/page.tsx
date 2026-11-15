import { IconMoneyBillCoin } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { FinanceFrame } from "@/components/finance/finance-frame";
import {
  IncomeAddButton,
  IncomesTable,
} from "@/components/finance/incomes-table";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  awaitedOn,
  incomeState,
  isOpen,
  remainingCents,
  type Income,
} from "@/lib/finance/money-in";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { treasury as t } from "@/lib/i18n/fr/treasury";
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatAmount } from "@/lib/utils/money";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.titles.incomes };

const amount = (cents: number) => formatAmount(cents, { ht: false });

const VIEWS = ["a-encaisser", "retard", "encaissees", "annulees"] as const;
type View = (typeof VIEWS)[number];
const asView = (value: unknown): View =>
  VIEWS.find((v) => v === value) ?? "a-encaisser";

/**
 * Finance › Factures & encaissements (Ibé's ticket, maquette 5): the money
 * coming in, « prévu → facturé → encaissé ». What is expected, invoiced,
 * late and received this month; every income by view. The Finance enters
 * an income, its receipts, changes or cancels it (manage_finance).
 */
export default async function FinanceIncomesPage({
  searchParams,
}: PageProps<"/app/finance/encaissements">) {
  const today = parisPlace(new Date()).day;
  const [access, params, data] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
    loadTreasury(today),
  ]);
  const view = asView(params.vue);
  const canManage = can(access, "manage_finance");
  const v = t.incomes;
  const state = (i: Income) => incomeState(i, today);
  const open = data.incomes.filter(isOpen);
  const sum = (list: Income[]) =>
    list.reduce((s, i) => s + remainingCents(i), 0);
  const expected = open.filter((i) => !i.invoiceNumber && state(i) !== "late");
  const invoiced = open.filter((i) => i.invoiceNumber);
  const late = open.filter((i) => state(i) === "late");
  const month = today.slice(0, 7);
  const thisMonth = data.incomes.flatMap((i) =>
    i.receipts.filter((r) => r.receivedOn.startsWith(month)),
  );
  const lists: Record<View, Income[]> = {
    "a-encaisser": [...open].sort((a, b) =>
      awaitedOn(a).localeCompare(awaitedOn(b)),
    ),
    retard: late.sort((a, b) => awaitedOn(a).localeCompare(awaitedOn(b))),
    encaissees: data.incomes.filter((i) => state(i) === "received").reverse(),
    annulees: data.incomes.filter((i) => i.cancelledAt).reverse(),
  };
  const labels: Record<View, string> = {
    "a-encaisser": v.views.open,
    retard: v.views.late,
    encaissees: v.views.received,
    annulees: v.views.cancelled,
  };

  // New style (docs/FINANCE-V2.md, lot 2): the action sits on the tabs' row;
  // in the frame's head only while there is no list yet.
  const action =
    canManage && access.organizationId ? (
      <IncomeAddButton
        targets={data.targets}
        organizationId={access.organizationId}
        ownerId={access.personId}
      />
    ) : undefined;
  const empty = data.incomes.length === 0 && !data.error;

  return (
    <FinanceFrame section="incomes" action={empty ? action : undefined}>
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {empty ? (
        <EmptyState
          icon={IconMoneyBillCoin}
          title={v.emptyTitle}
          body={v.emptyBody}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              title={v.tiles.expected}
              value={amount(sum(expected))}
              caption={v.tiles.expectedHint(expected.length)}
            />
            <MetricCard
              title={v.tiles.toCollect}
              value={amount(sum(invoiced))}
              caption={v.tiles.toCollectHint(invoiced.length)}
            />
            <MetricCard
              title={v.tiles.late}
              value={amount(sum(late))}
              caption={v.tiles.lateHint(late.length)}
              danger={late.length > 0}
              href={`${routes.financeIncomes}?vue=retard`}
              current={view === "retard"}
            />
            <MetricCard
              title={v.tiles.received}
              value={amount(thisMonth.reduce((s, r) => s + r.cents, 0))}
              caption={v.tiles.receivedHint(thisMonth.length)}
            />
          </div>
          <DataTableViews
            label={v.views.label}
            action={action}
            views={VIEWS.map((key) => ({
              href: `${routes.financeIncomes}?vue=${key}`,
              label: labels[key],
              count: lists[key].length,
              current: view === key,
            }))}
          >
            {lists[view].length === 0 ? (
              <EmptyNote>{v.emptyView}</EmptyNote>
            ) : (
              <IncomesTable
                incomes={lists[view]}
                targets={data.targets}
                today={today}
                canManage={canManage}
                organizationId={access.organizationId ?? ""}
                ownerId={access.personId}
                followUp={view === "retard"}
              />
            )}
          </DataTableViews>
        </>
      )}
    </FinanceFrame>
  );
}
