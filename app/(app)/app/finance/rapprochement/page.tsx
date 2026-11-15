import { IconCreditCard } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { FinanceFrame } from "@/components/finance/finance-frame";
import {
  ReconcileButtons,
  TransactionsTable,
} from "@/components/finance/transactions-table";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  possibleDuplicates,
  suggestionsFor,
  txLeft,
  txState,
  type BankTransaction,
} from "@/lib/finance/reconcile";
import { loadReconciliation } from "@/lib/finance/reconcile-queries";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { reconcile as t } from "@/lib/i18n/fr/reconcile";
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatAmount } from "@/lib/utils/money";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const amount = (cents: number) => formatAmount(cents, { ht: false });

const VIEWS = ["a-rapprocher", "rapprochees", "ignorees"] as const;
type View = (typeof VIEWS)[number];
const asView = (value: unknown): View =>
  VIEWS.find((v) => v === value) ?? "a-rapprocher";

/**
 * Finance › Rapprochement (Ibé's ticket, lot 6): the bank's transactions
 * (Qonto's CSV, or by hand) and what each settles. PDS OS proposes by
 * amount, day, party and reference; a person validates every match. Money
 * in becomes an income's receipt, money out is matched with its spend:
 * never a second income nor spend.
 */
export default async function FinanceReconcilePage({
  searchParams,
}: PageProps<"/app/finance/rapprochement">) {
  const today = parisPlace(new Date()).day;
  const [access, params, treasury] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
    loadTreasury(today),
  ]);
  const data = await loadReconciliation(treasury.incomes);
  const view = asView(params.vue);
  const canManage = can(access, "manage_finance");
  const state = (tx: BankTransaction) => txState(tx);
  const lists: Record<View, BankTransaction[]> = {
    "a-rapprocher": data.transactions.filter(
      (tx) => state(tx) === "open" || state(tx) === "partial",
    ),
    rapprochees: data.transactions.filter((tx) => state(tx) === "matched"),
    ignorees: data.transactions.filter((tx) => state(tx) === "ignored"),
  };
  const labels: Record<View, string> = {
    "a-rapprocher": t.views.open,
    rapprochees: t.views.matched,
    ignorees: t.views.ignored,
  };
  const open = lists["a-rapprocher"];
  const month = today.slice(0, 7);
  const matchedThisMonth = lists.rapprochees.filter((tx) =>
    tx.bookedOn.startsWith(month),
  );
  const suggested = open.filter(
    (tx) => suggestionsFor(tx, data.candidates).length > 0,
  );
  const doubles = possibleDuplicates(data.transactions);

  return (
    <FinanceFrame
      section="reconcile"
      action={canManage ? <ReconcileButtons /> : undefined}
    >
      {(data.error || treasury.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
      {data.transactions.length === 0 && !data.error ? (
        <EmptyState
          icon={IconCreditCard}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              title={t.tiles.open}
              value={amount(open.reduce((s, tx) => s + txLeft(tx), 0))}
              caption={t.tiles.openHint(open.length)}
              href={`${routes.financeReconcile}?vue=a-rapprocher`}
              current={view === "a-rapprocher"}
            />
            <MetricCard
              title={t.tiles.suggested}
              value={String(suggested.length)}
              caption={t.tiles.suggestedHint}
            />
            <MetricCard
              title={t.tiles.matched}
              value={amount(
                matchedThisMonth.reduce((s, tx) => s + Math.abs(tx.cents), 0),
              )}
              caption={t.tiles.matchedHint(matchedThisMonth.length)}
              href={`${routes.financeReconcile}?vue=rapprochees`}
              current={view === "rapprochees"}
            />
            <MetricCard
              title={t.tiles.doubles}
              value={String(doubles.size)}
              caption={t.tiles.doublesHint}
              danger={doubles.size > 0}
            />
          </div>
          <DataTableViews
            label={t.views.label}
            views={VIEWS.map((key) => ({
              href: `${routes.financeReconcile}?vue=${key}`,
              label: labels[key],
              count: lists[key].length,
              current: view === key,
            }))}
          >
            {lists[view].length === 0 ? (
              <EmptyNote>{t.emptyView}</EmptyNote>
            ) : (
              <TransactionsTable
                transactions={lists[view]}
                candidates={data.candidates}
                doubles={[...doubles]}
                canManage={canManage}
              />
            )}
          </DataTableViews>
        </>
      )}
    </FinanceFrame>
  );
}
