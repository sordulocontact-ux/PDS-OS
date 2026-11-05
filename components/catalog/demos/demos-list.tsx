"use client";

import { SearchableList } from "@/components/ui/searchable-list";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { MasterRow } from "@/lib/catalog/types";
import { demos } from "@/lib/i18n/fr/demos";
import { demoStatusTone } from "@/lib/ui/state-tones";

const fr = { demos };

/**
 * The Catalogue's maquettes (retours d'Ibé du 01 et du 05/11/2026): working
 * name, artists, status; an instant search. `filters`: the status filter of
 * the page, beside the search.
 */
export function DemosList({
  rows,
  filters,
  empty,
}: {
  rows: MasterRow[];
  filters?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.demos;
  return (
    <SearchableList
      items={rows}
      searchText={(m) => [m.title, m.artists]}
      label={t.search.label}
      placeholder={t.search.placeholder}
      noResult={t.search.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => (
        <DataTable>
          <DataTableHeader>
            <DataTableHead>{t.columns.title}</DataTableHead>
            <DataTableHead hideBelow="sm">{t.columns.artists}</DataTableHead>
            <DataTableHead fill>{t.columns.status}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {visible.map((demo) => (
              <DataTableRow key={demo.id}>
                <DataTableCell>
                  <DataTableLink href={routes.master(demo.id)}>
                    {demo.title}
                  </DataTableLink>
                </DataTableCell>
                <DataTableCell hideBelow="sm" className="break-words">
                  {demo.artists}
                </DataTableCell>
                <DataTableCell fill>
                  {demo.demoStatus && (
                    <StatusBadge tone={demoStatusTone[demo.demoStatus]}>
                      {t.statuses[demo.demoStatus]}
                    </StatusBadge>
                  )}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </SearchableList>
  );
}
