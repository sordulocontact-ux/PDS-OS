"use client";

import { ContractRowActions } from "@/components/contracts/contract-row-actions";
import { ContractSheet } from "@/components/contracts/contract-sheet";
import { ContractStateBadge } from "@/components/contracts/contract-state-badge";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  DataTableText,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { TableSortProvider } from "@/components/ui/table-sort";
import { useSheetRow } from "@/components/ui/use-sheet-row";
import { DueDate } from "@/components/ui/due-date";
import { routes } from "@/lib/auth/redirects";
import { awaitsDue, type ContractRow } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { records } from "@/lib/i18n/fr/records";
import { formatShortDate } from "@/lib/release/format";

const fr = { contracts, records };

// Contracts, newest first: the row opens the contract's side sheet
// (ContractSheet, the Réseau's model, Sacha 24/11/2026), and from there
// its page. One fact a column (Sacha 25/11/2026): its state, its type, its
// due date (said in words while still awaited), its project, its artist,
// its parties and who follows it; on a phone, the hidden ones under the
// title.
export function ContractsTable({ contracts }: { contracts: ContractRow[] }) {
  const t = fr.contracts;
  const withActions = contracts.some((c) => c.canEdit);
  const [sheet, setSheet] = useSheetRow(contracts.map((c) => c.id));
  // One sort for the table and its sheet: ↑ ↓ follow the rows as sorted.
  return (
    <TableSortProvider>
      <DataTable>
        <DataTableHeader>
          <DataTableHead icon="contract">{t.columns.title}</DataTableHead>
          <DataTableHead icon="status" hideBelow="sm">
            {t.columns.state}
          </DataTableHead>
          <DataTableHead icon="kind" hideBelow="md">
            {t.columns.type}
          </DataTableHead>
          <DataTableHead icon="date" hideBelow="md">
            {t.columns.due}
          </DataTableHead>
          <DataTableHead icon="project" hideBelow="lg">
            {t.columns.project}
          </DataTableHead>
          <DataTableHead icon="artist" hideBelow="xl">
            {t.columns.artist}
          </DataTableHead>
          <DataTableHead icon="people" hideBelow="2xl">
            {t.columns.parties}
          </DataTableHead>
          <DataTableHead icon="person" hideBelow="2xl" fill>
            {t.columns.owner}
          </DataTableHead>
          {withActions && (
            <DataTableActionsHead label={fr.records.menu.column} />
          )}
        </DataTableHeader>
        <DataTableBody>
          {contracts.map((contract, index) => (
            <DataTableRow key={contract.id}>
              <DataTableCell>
                <DataTableMedia
                  title={
                    <DataTableLink
                      href={routes.contract(contract.id)}
                      onOpen={() => setSheet(index)}
                    >
                      {contract.title}
                    </DataTableLink>
                  }
                  // On a phone, what its hidden columns say.
                  subtitle={
                    <span className="md:hidden">
                      {/* The state column shows from 640 px. */}
                      <span className="sm:hidden">
                        {t.states[contract.state]} ·{" "}
                      </span>
                      {[
                        t.types[contract.type],
                        contract.projectTitle,
                        contract.artistName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  }
                />
              </DataTableCell>
              <DataTableCell hideBelow="sm">
                <ContractStateBadge state={contract.state} />
              </DataTableCell>
              <DataTableCell hideBelow="md">
                <DataTableText>{t.types[contract.type]}</DataTableText>
              </DataTableCell>
              <DataTableCell hideBelow="md">
                {contract.dueOn ? (
                  <DueDate
                    dueOn={contract.dueOn}
                    awaited={awaitsDue(contract.state)}
                    fallback={formatShortDate(contract.dueOn)}
                  />
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
              <DataTableCell hideBelow="lg">
                <DataTableText>
                  {contract.projectTitle || EMPTY_CELL}
                </DataTableText>
              </DataTableCell>
              <DataTableCell hideBelow="xl">
                <DataTableText>
                  {contract.artistName || EMPTY_CELL}
                </DataTableText>
              </DataTableCell>
              <DataTableCell hideBelow="2xl">
                <DataTableText>
                  {contract.parties.join(", ") || EMPTY_CELL}
                </DataTableText>
              </DataTableCell>
              <DataTableCell hideBelow="2xl" fill>
                {contract.ownerName || EMPTY_CELL}
              </DataTableCell>
              {withActions && (
                <DataTableActionsCell>
                  <ContractRowActions contract={contract} reveal />
                </DataTableActionsCell>
              )}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      <ContractSheet
        contracts={contracts}
        index={sheet}
        onClose={() => setSheet(null)}
        onMove={setSheet}
      />
    </TableSortProvider>
  );
}
