"use client";

import type { ReactNode } from "react";

import { TransactionsTable } from "@/components/finance/transactions-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { BankTransaction, Candidate } from "@/lib/finance/reconcile";
import { reconcile as t } from "@/lib/i18n/fr/reconcile";
import { formatAmount } from "@/lib/utils/money";

/**
 * Finance › Rapprochement as the proto's page (Sacha 15/11/2026): the search
 * with the views and the actions beside it (set by the page), the table, and
 * under it the count and signed sum of what is listed, following the search.
 */
export function TransactionsList({
  transactions,
  candidates,
  doubles,
  proofLines,
  canManage,
  filters,
  empty,
}: {
  transactions: BankTransaction[];
  candidates: Candidate[];
  doubles: string[];
  proofLines: string[];
  canManage: boolean;
  filters: ReactNode;
  empty: ReactNode;
}) {
  return (
    <SearchableList
      items={transactions}
      searchText={(tx) => [tx.counterparty, tx.label, tx.reference]}
      label={t.searchLabel}
      placeholder={t.search}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => {
        const sum = visible.reduce((s, tx) => s + tx.cents, 0);
        return (
          <div className="flex flex-col gap-3">
            <TransactionsTable
              transactions={visible}
              candidates={candidates}
              doubles={doubles}
              proofLines={proofLines}
              canManage={canManage}
            />
            <p
              aria-label={t.total.label}
              className="flex flex-wrap items-baseline justify-end gap-x-4 px-1 text-body-sm text-[color:var(--text-secondary)] tabular-nums"
            >
              <span>{t.total.count(visible.length)}</span>
              <span className="text-[color:var(--text-primary)]">
                {sum > 0 ? "+" : sum < 0 ? "−" : ""}
                {formatAmount(Math.abs(sum), { ht: false })}
              </span>
            </p>
          </div>
        );
      }}
    </SearchableList>
  );
}
