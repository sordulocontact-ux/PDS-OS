import { IconCreditCard } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { ReconcileButtons } from "@/components/finance/transactions-table";
import { TransactionsList } from "@/components/finance/transactions-list";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  possibleDuplicates,
  txState,
  type BankTransaction,
} from "@/lib/finance/reconcile";
import { loadReconciliation } from "@/lib/finance/reconcile-queries";
import { loadSpends } from "@/lib/finance/spend-queries";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { reconcile as t } from "@/lib/i18n/fr/reconcile";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

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
  const [access, params, treasury, spends] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
    loadTreasury(today),
    loadSpends(),
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
  const doubles = possibleDuplicates(data.transactions);
  const proofLines = spends.spends.filter((x) => x.hasProof).map((x) => x.id);

  // New style (docs/FINANCE-V2.md, lot 2): the actions sit on the tabs' row;
  // in the frame's head only while there is no list yet.
  const action = canManage ? <ReconcileButtons /> : undefined;
  const empty = data.transactions.length === 0 && !data.error;

  return (
    <FinanceFrame section="reconcile" action={empty ? action : undefined}>
      {(data.error || treasury.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
      {empty ? (
        <EmptyState
          icon={IconCreditCard}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <TransactionsList
          transactions={lists[view]}
          candidates={data.candidates}
          doubles={[...doubles]}
          proofLines={proofLines}
          canManage={canManage}
          empty={<EmptyNote>{t.emptyView}</EmptyNote>}
          filters={
            <>
              <SegmentedLinks
                label={t.views.label}
                options={VIEWS.map((key) => ({
                  key,
                  href: `${routes.financeReconcile}?vue=${key}`,
                  label: (
                    <>
                      {labels[key]}
                      <span className="text-[color:var(--text-tertiary)] tabular-nums">
                        {lists[key].length}
                      </span>
                    </>
                  ),
                  current: view === key,
                }))}
              />
              {action}
            </>
          }
        />
      )}
    </FinanceFrame>
  );
}
