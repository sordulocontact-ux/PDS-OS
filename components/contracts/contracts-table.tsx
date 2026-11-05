import { IconHandshake } from "nucleo-sharp-essential";

import { ContractRowActions } from "@/components/contracts/contract-row-actions";
import { ContractStateBadge } from "@/components/contracts/contract-state-badge";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { ContractRow } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { records } from "@/lib/i18n/fr/records";
import { formatShortDate } from "@/lib/release/format";
import { overdueTone } from "@/lib/ui/state-tones";

const fr = { contracts, records };

// Contracts, newest first: the row opens the contract; its type and what it
// is about read under the title; its state, its parties, its due date (past
// ones flagged) and who follows it.
export function ContractsTable({ contracts }: { contracts: ContractRow[] }) {
  const t = fr.contracts;
  const withActions = contracts.some((c) => c.canEdit);
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.title}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.state}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.parties}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.due}</DataTableHead>
        <DataTableHead hideBelow="lg" fill>
          {t.columns.owner}
        </DataTableHead>
        {withActions && <DataTableActionsHead label={fr.records.menu.column} />}
      </DataTableHeader>
      <DataTableBody>
        {contracts.map((contract) => (
          <DataTableRow key={contract.id}>
            <DataTableCell>
              <DataTableMedia
                visual={<DataTableIcon icon={IconHandshake} />}
                title={
                  <DataTableLink href={routes.contract(contract.id)}>
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
              <span className="line-clamp-2 whitespace-normal">
                {contract.parties.join(", ") || EMPTY_CELL}
              </span>
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {contract.dueOn ? (
                <span className="flex flex-col items-start gap-1">
                  {formatShortDate(contract.dueOn)}
                  {contract.due && (
                    <StatusBadge tone={overdueTone} size="sm">
                      {t.due}
                    </StatusBadge>
                  )}
                </span>
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
  );
}
