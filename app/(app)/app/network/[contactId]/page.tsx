import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContractStateBadge } from "@/components/contracts/contract-state-badge";
import { ContactActions } from "@/components/network/contact-actions";
import { ContactHistory } from "@/components/network/contact-history";
import { ContactMarketing } from "@/components/network/contact-marketing";
import { ContactProjects } from "@/components/network/contact-projects";
import { BackLink } from "@/components/shell/back-link";
import { ReturnBanner } from "@/components/shell/return-banner";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { FactList } from "@/components/ui/fact-list";
import { CardRow, ListCard } from "@/components/ui/list-card";
import { ToneCallout } from "@/components/ui/tone-callout";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { asContractStatus } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { loadContactMarketing } from "@/lib/network/campaigns";
import { loadContactHistory } from "@/lib/network/contact-history";
import { loadContactProjects } from "@/lib/network/contact-projects";
import { getNetworkContact } from "@/lib/network/queries";
import { socialLinksOf } from "@/lib/network/socials";
import { relationsText, rolesText } from "@/lib/network/types";

export const metadata = { title: `${fr.network.title} · ${fr.app.name}` };

const linkClass =
  "underline-offset-4 hover:underline focus-visible:underline outline-none";

/**
 * A contact of the network: what it does, how PDS works with it, how to
 * reach it, its organization and catalog artist (a person), or the people
 * of the network associated with it (an organization), and
 * the contracts it is a party to, among those the viewer may read ; its
 * Marketing campaigns and dated observations (influencers, media). First
 * what waits for it and what it does in each project, then its credits and
 * calls (proto des pages, 29/10/2026).
 */
export default async function NetworkContactPage({
  params,
}: PageProps<"/app/network/[contactId]">) {
  const access = await requireApproved();
  const { contactId } = await params;
  const [contact, marketing, projects, history] = await Promise.all([
    getNetworkContact(contactId),
    loadContactMarketing(contactId, {
      target: routes.projectActivationTarget,
      activation: routes.projectActivation,
    }),
    loadContactProjects(contactId),
    loadContactHistory(contactId),
  ]);
  if (!contact) notFound();
  const t = fr.network;
  const p = t.page;
  const accounts = socialLinksOf(contact);

  return (
    <PageContainer>
      <BackLink href={routes.network}>{p.back}</BackLink>
      {/* Opened from a contract of the Juridique to complete it (JUR-10). */}
      <Suspense fallback={null}>
        <ReturnBanner scope={contact.id} />
      </Suspense>
      <PageHeader
        title={contact.name}
        description={[t.kinds[contact.kind], rolesText(contact.roles)]
          .filter(Boolean)
          .join(" · ")}
        action={
          <ContactActions
            contact={contact}
            size="icon-lg"
            leaveTo={routes.network}
            rights={{
              canEdit: can(access, "manage_network"),
              canArchive: can(access, "archive_records"),
              archived: contact.archived,
            }}
          />
        }
      />
      {contact.archived && <ToneCallout>{p.archived}</ToneCallout>}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <ContactProjects
            name={contact.name}
            email={contact.email}
            projects={projects}
          />
          {contact.kind === "organization" && (
            <ListCard
              title={p.members}
              count={contact.members.length}
              empty={contact.members.length === 0 ? p.membersEmpty : undefined}
            >
              {contact.members.map((member) => (
                <CardRow
                  key={member.id}
                  href={routes.networkContact(member.id)}
                  main={member.name}
                  sub={rolesText(member.roles)}
                />
              ))}
            </ListCard>
          )}
          <ListCard
            title={p.contracts}
            count={contact.contracts.length}
            empty={
              contact.contracts.length === 0 ? p.contractsEmpty : undefined
            }
          >
            {contact.contracts.map((contract) => (
              <CardRow
                key={contract.id}
                href={routes.contract(contract.id)}
                main={contract.title}
                sub={contract.role ?? undefined}
                badge={
                  <ContractStateBadge
                    state={asContractStatus(contract.status)}
                  />
                }
              />
            ))}
          </ListCard>
          <ContactHistory credits={history.credits} calls={history.calls} />
          <ContactMarketing
            contactId={contact.id}
            campaigns={marketing.campaigns}
            observations={marketing.observations}
            canWrite={can(access, "manage_network") && !contact.archived}
            today={todayInParis()}
          />
        </div>
        <FactList
          emptyLabel={p.none}
          facts={[
            {
              label: p.email,
              value: contact.email && (
                <a href={`mailto:${contact.email}`} className={linkClass}>
                  {contact.email}
                </a>
              ),
            },
            {
              label: p.phone,
              value: contact.phone && (
                <a href={`tel:${contact.phone}`} className={linkClass}>
                  {contact.phone}
                </a>
              ),
            },
            {
              label: p.website,
              value: contact.website && (
                <a
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {contact.website}
                </a>
              ),
            },
            { label: p.city, value: contact.city },
            {
              label: p.relations,
              value: relationsText(contact.relations) || null,
            },
            {
              label: p.accounts,
              value: accounts.length > 0 && (
                <span className="flex flex-col gap-1">
                  {accounts.map((account) => (
                    <a
                      key={account.network}
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      {fr.network.form[account.network]}
                      {account.label && ` · ${account.label}`}
                    </a>
                  ))}
                </span>
              ),
            },
            ...(contact.kind === "person"
              ? [
                  {
                    label: p.parent,
                    value: contact.parentId && contact.parentName && (
                      <Link
                        href={routes.networkContact(contact.parentId)}
                        className={linkClass}
                      >
                        {contact.parentName}
                      </Link>
                    ),
                  },
                ]
              : []),
            // A catalog artist is a person's link only (ticket « Retour PO /
            // Réseau » of 11/10/2026: never on a label's page).
            ...(contact.kind === "person"
              ? [
                  {
                    label: p.artist,
                    value: contact.artistId && contact.artistName && (
                      <Link
                        href={routes.artist(contact.artistId)}
                        className={linkClass}
                      >
                        {contact.artistName}
                      </Link>
                    ),
                  },
                ]
              : []),
            { label: p.notes, value: contact.notes },
          ]}
        />
      </div>
    </PageContainer>
  );
}
