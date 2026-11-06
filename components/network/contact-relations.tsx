import { ContractStateBadge } from "@/components/contracts/contract-state-badge";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { asContractStatus } from "@/lib/contracts/types";
import { network } from "@/lib/i18n/fr/network";
import type { NetworkContactDetail } from "@/lib/network/queries";
import { rolesText } from "@/lib/network/types";

const fr = { network };

/** The contracts a contact is a party to, among those one may read. */
export function ContactContracts({
  contracts,
}: {
  contracts: NetworkContactDetail["contracts"];
}) {
  const p = fr.network.page;
  return (
    <PageSection
      card
      id="contracts"
      title={p.contracts}
      description={p.contractsDescription}
    >
      {contracts.length === 0 ? (
        <EmptyNote>{p.contractsEmpty}</EmptyNote>
      ) : (
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead>{p.columns.contract}</DataTableHead>
            <DataTableHead hideBelow="sm">{p.columns.role}</DataTableHead>
            <DataTableHead fill>{p.columns.state}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {contracts.map((contract) => (
              <DataTableRow key={contract.id}>
                <DataTableCell>
                  <DataTableLink href={routes.contract(contract.id)}>
                    {contract.title}
                  </DataTableLink>
                </DataTableCell>
                <DataTableCell hideBelow="sm" className="break-words">
                  {contract.role || EMPTY_CELL}
                </DataTableCell>
                <DataTableCell fill>
                  <ContractStateBadge
                    state={asContractStatus(contract.status)}
                  />
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}

/** The people of the network who work for an organization. */
export function ContactMembers({
  members,
}: {
  members: NetworkContactDetail["members"];
}) {
  const p = fr.network.page;
  return (
    <PageSection
      card
      id="members"
      title={p.members}
      description={p.membersDescription}
    >
      {members.length === 0 ? (
        <EmptyNote>{p.membersEmpty}</EmptyNote>
      ) : (
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead>{p.columns.name}</DataTableHead>
            <DataTableHead fill>{p.columns.roles}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {members.map((member) => (
              <DataTableRow key={member.id}>
                <DataTableCell>
                  <DataTableLink href={routes.networkContact(member.id)}>
                    {member.name}
                  </DataTableLink>
                </DataTableCell>
                <DataTableCell fill className="break-words">
                  {rolesText(member.roles) || EMPTY_CELL}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}
