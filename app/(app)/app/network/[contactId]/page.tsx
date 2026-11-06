import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ContactActions } from "@/components/network/contact-actions";
import { ContactCoordinates } from "@/components/network/contact-coordinates";
import { ContactHistory } from "@/components/network/contact-history";
import { ContactMarketing } from "@/components/network/contact-marketing";
import {
  ContactAwaited,
  ContactFiches,
  ContactInProjects,
} from "@/components/network/contact-projects";
import {
  ContactContracts,
  ContactMembers,
} from "@/components/network/contact-relations";
import { emailEnabled } from "@/lib/email/send";
import { EditContactButton } from "@/components/network/edit-contact-button";
import { BackLink } from "@/components/shell/back-link";
import { ReturnBanner } from "@/components/shell/return-banner";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { ToneCallout } from "@/components/ui/tone-callout";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { loadContactMarketing } from "@/lib/network/campaigns";
import { loadContactHistory } from "@/lib/network/contact-history";
import { loadContactProjects } from "@/lib/network/contact-projects";
import { getNetworkContact } from "@/lib/network/queries";
import { rolesText } from "@/lib/network/types";

export const metadata = { title: `${fr.network.title} · ${fr.app.name}` };

/**
 * A contact of the network (proto des pages, 29/10/2026): first what waits
 * for it and what it does in each project, then its contracts, credits,
 * calls, the people of an organization, its Marketing campaigns and dated
 * observations; on the side how to reach it and its fiches de
 * renseignements. Each block is a titled card, as on a title's page.
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
  const canEdit = can(access, "manage_network") && !contact.archived;

  return (
    <PageContainer>
      <BackLink href={routes.network}>{p.back}</BackLink>
      {/* Opened from a contract of the Juridique to complete it (JUR-10). */}
      <Suspense fallback={null}>
        <ReturnBanner scope={contact.id} />
      </Suspense>
      <PageHeader
        leading={
          <Avatar
            name={contact.name}
            pictureUrl={contact.pictureUrl ?? null}
            className="size-16 text-[length:var(--type-body-lg)]"
          />
        }
        title={contact.name}
        description={[
          t.kinds[contact.kind],
          rolesText(contact.roles),
          contact.parentName && t.memberOf(contact.parentName),
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && <EditContactButton contactId={contact.id} />}
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
          </div>
        }
      />
      {contact.archived && <ToneCallout>{p.archived}</ToneCallout>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <ContactAwaited
            name={contact.name}
            email={contact.email}
            contactId={contact.id}
            canEmail={emailEnabled()}
            projects={projects}
          />
          <ContactInProjects projects={projects} />
          <ContactContracts contracts={contact.contracts} />
          <ContactHistory credits={history.credits} calls={history.calls} />
          {contact.kind === "organization" && (
            <ContactMembers members={contact.members} />
          )}
          <ContactMarketing
            contactId={contact.id}
            campaigns={marketing.campaigns}
            observations={marketing.observations}
            canWrite={canEdit}
            today={todayInParis()}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <ContactCoordinates contact={contact} />
          <ContactFiches projects={projects} />
        </div>
      </div>
    </PageContainer>
  );
}
