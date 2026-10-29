import { ContractStateBadge } from "@/components/contracts/contract-state-badge";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { SectionRow, SectionRows } from "@/components/ui/section-rows";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { asContractStatus } from "@/lib/contracts/types";
import { network } from "@/lib/i18n/fr/network";
import type { NetworkContactDetail } from "@/lib/network/queries";
import { rolesText } from "@/lib/network/types";

const fr = { network };

const linkClass = "font-semibold no-underline hover:underline";

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
        <SectionRows label={p.contracts}>
          {contracts.map((contract) => (
            <SectionRow
              key={contract.id}
              title={
                <ViewLink
                  href={routes.contract(contract.id)}
                  className={linkClass}
                >
                  {contract.title}
                </ViewLink>
              }
              detail={contract.role}
              badge={
                <ContractStateBadge state={asContractStatus(contract.status)} />
              }
            />
          ))}
        </SectionRows>
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
        <SectionRows label={p.members}>
          {members.map((member) => (
            <SectionRow
              key={member.id}
              title={
                <ViewLink
                  href={routes.networkContact(member.id)}
                  className={linkClass}
                >
                  {member.name}
                </ViewLink>
              }
              detail={rolesText(member.roles) || null}
            />
          ))}
        </SectionRows>
      )}
    </PageSection>
  );
}
