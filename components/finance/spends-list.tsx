"use client";

import type { ReactNode } from "react";

import {
  SpendColumnsMenu,
  useSpendColumns,
} from "@/components/finance/spend-columns";
import { SpendsTable } from "@/components/finance/spends-table";
import { SearchableList } from "@/components/ui/searchable-list";
import { totalsOf } from "@/lib/finance/envelopes";
import { spendTtc, type FinanceSpend } from "@/lib/finance/spends";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { budget } from "@/lib/i18n/fr/budget";
import { financeSpends } from "@/lib/i18n/fr/finance-spends";
import { formatAmount } from "@/lib/utils/money";

const t = financeSpends;
const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * Finance › Dépenses as the proto's page (Sacha 15/11/2026): one list, the
 * search with the filters beside it (envelope, status, without proof, set
 * in the address by the page), then the table and, under it, the total of
 * what is listed (Ibé's « prévu, engagé, facturé et payé », HT, and the
 * whole TTC), following the search too.
 */
export function SpendsList({
  spends,
  targets,
  canManage,
  organizationId,
  ownerId,
  filters,
  add,
  empty,
}: {
  spends: FinanceSpend[];
  targets: FinanceTarget[];
  canManage: boolean;
  organizationId: string;
  ownerId: string | null;
  filters: ReactNode;
  // « + » at the end of the tools, after the columns' menu.
  add?: ReactNode;
  empty: ReactNode;
}) {
  const [columns, toggle] = useSpendColumns();
  const name = new Map(targets.map((x) => [x.id, x.name]));
  return (
    <SearchableList
      items={spends}
      searchText={(s) => [
        s.label,
        s.supplier,
        s.subpost,
        s.family && s.family !== "other"
          ? budget.families[s.family]
          : s.familyDetail,
        name.get(s.target.id),
      ]}
      label={t.searchLabel}
      placeholder={t.search}
      noResult={t.noResult}
      filters={
        <>
          {filters}
          <SpendColumnsMenu shown={columns} onToggle={toggle} />
          {add}
        </>
      }
      empty={empty}
    >
      {(visible) => (
        <div className="flex flex-col gap-3">
          <SpendsTable
            spends={visible}
            targets={targets}
            canManage={canManage}
            organizationId={organizationId}
            ownerId={ownerId}
            columns={columns}
          />
          <Total spends={visible} />
        </div>
      )}
    </SearchableList>
  );
}

/** The total under the list: how many, each stage HT, the whole TTC. */
function Total({ spends }: { spends: FinanceSpend[] }) {
  const totals = totalsOf(spends);
  const ttc = spends.reduce((sum, s) => sum + spendTtc(s), 0);
  const parts = [
    [t.total.planned, totals.plannedCents],
    [t.total.committed, totals.committedCents],
    [t.total.invoiced, totals.invoicedCents],
    [t.total.paid, totals.paidCents],
  ] as const;
  return (
    <p
      aria-label={t.total.label}
      className="flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1 px-1 text-body-sm text-[color:var(--text-secondary)] tabular-nums"
    >
      <span>{t.total.count(spends.length)}</span>
      {parts
        .filter(([, cents]) => cents > 0)
        .map(([label, cents]) => (
          <span key={label}>
            {label} {amount(cents)}
          </span>
        ))}
      <span className="text-[color:var(--text-primary)]">
        {amount(ttc)} {t.total.ttc}
      </span>
    </p>
  );
}
