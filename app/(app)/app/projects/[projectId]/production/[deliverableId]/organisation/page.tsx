import { IconBox2 } from "nucleo-sharp-essential";

import { HeritageSection } from "@/components/production/prep/heritage-section";
import { ScheduleSection } from "@/components/production/preprod/schedule-section";
import { OrganisationForm } from "@/components/production/journey/organisation-form";
import { StepPanel } from "@/components/production/journey/step-panel";
import { WhoDoesWhat } from "@/components/production/journey/who-does-what";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { loadValidators } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { stepHref } from "@/lib/production/journey/href";
import { prepContext } from "@/lib/production/journey/prep-context";

const t = fr.productionOrganization;

export const metadata = {
  title: `${fr.productionJourney.steps.organisation.title} · ${fr.app.name}`,
};

/**
 * The first step of a deliverable's production (Ibé, 14/10): who produces it
 * — internal or external — and who holds each role, prefilled; then « Qui
 * fait quoi » with the providers' private links, what the Conception decided
 * and the dates and envelope that frame it.
 */
export default async function ProductionOrganisationPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/organisation">) {
  const { projectId, deliverableId } = await params;
  const { access, data, step, steps } = await stepContext(
    projectId,
    deliverableId,
    "organisation",
  );
  if (!data.heritage.fiche && !data.heritage.source)
    return (
      <EmptyState
        icon={IconBox2}
        title={fr.productionPrep.notValidatedTitle}
        body={fr.productionPrep.notValidated}
        action={
          <ViewLink
            href={routes.projectDesign(projectId)}
            className={buttonVariants({ variant: "outline" })}
          >
            {fr.productionPrep.toConception}
          </ViewLink>
        }
      />
    );

  const sheet = data.sheet;
  const org = sheet?.organization ?? null;
  const validators = access.organizationId
    ? await loadValidators(access.organizationId)
    : [];
  const prep = sheet ? await prepContext(projectId, deliverableId) : null;
  const form = data.canOpen && (
    <OrganisationForm
      projectId={projectId}
      deliverableId={deliverableId}
      current={{
        kind: org?.kind ?? null,
        companyId: org?.company?.id ?? null,
        lineProducerId: org?.lineProducer?.personId ?? null,
        validatorId: org?.quoteValidator?.personId ?? null,
        director: sheet?.director ?? null,
        dop: org?.dop ?? null,
      }}
      members={data.members}
      contacts={data.contacts}
      defaultValidatorId={validators[0]?.personId ?? null}
      nextHref={{
        internal: stepHref(projectId, deliverableId, "direction"),
        external: stepHref(projectId, deliverableId, "call"),
      }}
    />
  );

  return (
    <StepPanel step={step} steps={steps}>
      {step.status === "done" && prep ? (
        <>
          <WhoDoesWhat
            projectId={projectId}
            data={data}
            links={prep.links}
            canOrganize={data.canOrganize}
          />
          {form && (
            <PageSection
              id="organisation-change"
              title={t.change}
              collapsible
              defaultOpen={false}
            >
              {form}
            </PageSection>
          )}
        </>
      ) : (
        form || null
      )}
      {prep && (
        <ScheduleSection
          {...prep.common}
          own={prep.sheet.logistics}
          logistics={prep.o.logistics}
          schedule={prep.o.schedule}
          ownerName={data.ownerName}
          ready={prep.sheet.readyAt !== null}
        >
          {null}
        </ScheduleSection>
      )}
      <HeritageSection data={data} />
    </StepPanel>
  );
}
