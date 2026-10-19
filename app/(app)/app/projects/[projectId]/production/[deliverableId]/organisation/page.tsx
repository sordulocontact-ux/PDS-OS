import { IconBox2 } from "nucleo-sharp-essential";

import { CallFacts } from "@/components/calls/call-facts";
import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { WhoProducesForm } from "@/components/production/journey/who-produces-form";
import { HeritageSection } from "@/components/production/prep/heritage-section";
import { ScheduleSection } from "@/components/production/preprod/schedule-section";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { companyOptions } from "@/lib/production/companies";
import { stepContext } from "@/lib/production/journey/context";
import { prepContext } from "@/lib/production/journey/prep-context";
import { effectiveLogistics } from "@/lib/production/logistics";
import { formatDay, formatShortDay } from "@/lib/utils/day";

const t = fr.productionProducer;

export const metadata = {
  title: `${fr.productionJourney.steps.organisation.title} · ${fr.app.name}`,
};

/**
 * « Qui produit ? », the first step of a deliverable's production (proto
 * « Projet complet » pqBody): what was transferred and when it is due, then
 * the owner chooses internal or external, the company, how to organise the
 * preproduction, and confirms. Once chosen: who produces, chosen by whom
 * and when; the dates, the envelope and what the Conception decided stay
 * below, folded.
 */
export default async function ProductionOrganisationPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/organisation">) {
  const { projectId, deliverableId } = await params;
  const { data, step, steps } = await stepContext(
    projectId,
    deliverableId,
    "organisation",
  );
  const { fiche } = data.heritage;
  if (!fiche && !data.heritage.source)
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
  const delivery = effectiveLogistics(sheet?.logistics ?? null, fiche)
    .deliveryDate.value;
  const facts = [
    {
      label: t.facts.fiche,
      value: fiche
        ? t.facts.ficheValue(
            data.deliverable.title,
            fiche.version,
            fiche.items.length > 1
              ? t.facts.series(fiche.items.length)
              : t.facts.single,
          )
        : t.facts.ficheValue(
            data.deliverable.title,
            data.heritage.source?.number ?? 1,
            null,
          ),
    },
    ...(delivery
      ? [{ label: t.facts.delivery, value: formatDay(delivery) }]
      : []),
  ];

  if (!org?.kind) {
    const companies = data.canOpen
      ? await companyOptions(projectId, data.contacts, null)
      : [];
    const producer = org?.lineProducer;
    return (
      <ProductionStepPanel
        projectId={projectId}
        deliverableId={deliverableId}
        step={step}
        steps={steps}
      >
        <CallFacts facts={facts} />
        {data.canOpen && (
          <WhoProducesForm
            projectId={projectId}
            deliverableId={deliverableId}
            internalHint={t.kinds.internal.hint(
              producer?.name ?? data.ownerName ?? "—",
              producer ? t.producerRole : t.ownerRole,
            )}
            companies={companies}
            defaults={{ mode: sheet?.mode ?? null }}
          />
        )}
      </ProductionStepPanel>
    );
  }

  const prep = await prepContext(projectId, deliverableId);
  const who = [
    t.kinds[org.kind].label,
    org.kind === "external" ? org.company?.name : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
      closed={Boolean(prep.sheet.closedAt)}
    >
      <ToneCallout tone="success">
        <b className="font-semibold">{who}</b>
        {t.chosen(
          t.mode.short[prep.sheet.mode],
          org.organizedBy ?? data.ownerName ?? "—",
          formatShortDay(org.organizedAt ?? prep.sheet.openedAt),
        )}
      </ToneCallout>
      <CallFacts facts={facts} />
      <PageSection
        id="production-frame"
        title={t.more}
        collapsible
        defaultOpen={false}
      >
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
        <HeritageSection data={data} />
      </PageSection>
    </ProductionStepPanel>
  );
}
