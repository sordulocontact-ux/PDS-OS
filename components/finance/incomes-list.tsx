"use client";

import type { ReactNode } from "react";

import { IncomesTable } from "@/components/finance/incomes-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { Income } from "@/lib/finance/money-in";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { treasury } from "@/lib/i18n/fr/treasury";

const t = treasury.incomes;

/**
 * Finance › Factures as Dépenses' page: the search on the left, the views
 * and the « + » on the right (set by the page), then the table; the search
 * runs on the invoice, its label, the client and its project or artist.
 */
export function IncomesList({
  incomes,
  targets,
  today,
  canManage,
  organizationId,
  ownerId,
  filters,
  empty,
}: {
  incomes: Income[];
  targets: FinanceTarget[];
  today: string;
  canManage: boolean;
  organizationId: string;
  ownerId: string | null;
  filters: ReactNode;
  empty: ReactNode;
}) {
  const name = new Map(targets.map((x) => [x.id, x.name]));
  return (
    <SearchableList
      items={incomes}
      searchText={(i) => [
        i.invoiceNumber,
        i.label,
        i.payer,
        i.projectId && name.get(i.projectId),
        i.artistId && name.get(i.artistId),
        i.dealId && name.get(i.dealId),
      ]}
      label={t.searchLabel}
      placeholder={t.search}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => (
        <IncomesTable
          incomes={visible}
          targets={targets}
          today={today}
          canManage={canManage}
          organizationId={organizationId}
          ownerId={ownerId}
        />
      )}
    </SearchableList>
  );
}
