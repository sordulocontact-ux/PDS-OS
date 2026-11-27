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
  DataTableText,
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
      {(visible) => <DemosTable rows={visible} />}
    </SearchableList>
  );
}

/** The maquettes, one fact a column; a name opens the title's page. */
function DemosTable({ rows }: { rows: MasterRow[] }) {
  const t = fr.demos;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead icon="master">{t.columns.title}</DataTableHead>
        <DataTableHead icon="artist" hideBelow="sm">
          {t.columns.artists}
        </DataTableHead>
        <DataTableHead icon="status" fill>
          {t.columns.status}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((demo) => (
          <DataTableRow key={demo.id}>
            <DataTableCell>
              <DataTableLink href={routes.master(demo.id)}>
                {demo.title}
              </DataTableLink>
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              <DataTableText>{demo.artists}</DataTableText>
            </DataTableCell>
            <DataTableCell fill>
              <span className="flex flex-wrap gap-1.5">
                {demo.demoStatus && (
                  <StatusBadge tone={demoStatusTone[demo.demoStatus]}>
                    {t.statuses[demo.demoStatus]}
                  </StatusBadge>
                )}
                {demo.provisional && (
                  <StatusBadge tone="warning" title={t.provisionalHint}>
                    {t.provisional}
                  </StatusBadge>
                )}
              </span>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
