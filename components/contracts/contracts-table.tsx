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
// its page; its type and what it
// is about read under the title; its state, its parties, its due date (said in words
// while still awaited) and who follows it.
export function ContractsTable({ contracts }: { contracts: ContractRow[] }) {
  const t = fr.contracts;
  const withActions = contracts.some((c) => c.canEdit);
  const [sheet, setSheet] = useSheetRow(contracts.map((c) => c.id));
  // One sort for the table and its sheet: ↑ ↓ follow the rows as sorted.
  return (
    <TableSortProvider>
      <DataTable>
        <DataTableHeader>
          <DataTableHead>{t.columns.title}</DataTableHead>
          <DataTableHead hideBelow="sm">{t.columns.state}</DataTableHead>
          <DataTableHead hideBelow="lg">{t.columns.parties}</DataTableHead>
          <DataTableHead hideBelow="md">{t.columns.due}</DataTableHead>
          <DataTableHead hideBelow="lg" fill>
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
                  subtitle={
                    <>
                      {/* The state column is hidden on phones. */}
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
                    </>
                  }
                />
              </DataTableCell>
              <DataTableCell hideBelow="sm">
                <ContractStateBadge state={contract.state} />
              </DataTableCell>
              <DataTableCell hideBelow="lg">
                <DataTableText>
                  {contract.parties.join(", ") || EMPTY_CELL}
                </DataTableText>
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
              <DataTableCell hideBelow="lg" fill>
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
