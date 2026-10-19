import { ProjectHeader } from "@/components/projects/project-header";
import { DeliverableBar } from "@/components/production/journey/deliverable-bar";
import { ContactLinksSection } from "@/components/portal/contact-links-section";
import { ProductionWhoDoesWhatButton } from "@/components/production/journey/who-does-what";
import {
  SheetKindBadge,
  SheetNotices,
  sheetFacts,
} from "@/components/production/prep/sheet-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { PathNowCard } from "@/components/shell/journey/path-now-card";
import { ModuleAttention } from "@/components/shell/module/module-attention";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { elsewhereOf, loadProjectJourneys } from "@/lib/journey/project";
import { journeyContext } from "@/lib/production/journey/context";
import { loadProductionHistory } from "@/lib/production/history";
import {
  productionStepChoices,
  productionStepRef,
} from "@/lib/production/journey/step-ref";
import { loadProviderLinks } from "@/lib/production/post/requests";
import { loadRevokedLinks } from "@/lib/production/producer-history";
import { projectHeaderData } from "@/lib/projects/header";
import { createClient } from "@/lib/supabase/server";

// One deliverable's production as a journey (Ibé, 14/10; proto « Projet
// complet »): the module's head (trail « Projet › Marketing › Production ›
// livrable › étape », who produces, « Qui fait quoi », what frames it),
// « Maintenant » for the person looking, the points to look at, the bar of
// the deliverables in Production, then the steps on the left and the open
// step on the right — one page per step. Pages check access themselves;
// everything is read once per request (journeyContext is cached).
export default async function ProductionSheetLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/production/[deliverableId]">) {
  const { projectId, deliverableId } = await params;
  const [{ access, data, steps }, journeys, header] = await Promise.all([
    journeyContext(projectId, deliverableId),
    loadProjectJourneys(projectId),
    projectHeaderData(projectId),
  ]);
  const started = Boolean(data.heritage.fiche || data.heritage.source);
  const viewer =
    data.members.find((m) => m.personId === access.personId)?.name ?? null;
  const sheet = data.sheet;
  const organized = Boolean(sheet?.organization.kind);
  const [links, history, revoked] = sheet
    ? await Promise.all([
        loadProviderLinks(await createClient(), sheet.id),
        loadProductionHistory(sheet.id, data, [
          "sheet.organized",
          "link.sent",
          "link.revoked",
        ]),
        loadRevokedLinks(sheet.id),
      ])
    : [{}, [], {}];
  // The creative side, as the journey resolved it (direction's coordinator).
  const creativeName =
    steps
      .find((s) => s.key === "direction")
      ?.roles?.find((x) => x.kind === "coord")?.name ?? null;
  const release = header?.facts.find((f) => f.key === "release");
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        extraCrumbs={[
          {
            label: data.deliverable.title,
            href: routes.projectProductionSheet(projectId, deliverableId),
          },
        ]}
        steps={steps}
        actions={
          <>
            {organized && <SheetKindBadge data={data} />}
            <ProductionWhoDoesWhatButton
              projectId={projectId}
              data={data}
              links={links}
              revoked={revoked}
              creativeName={creativeName}
              canOrganize={data.canOrganize}
              history={history}
              personLinks={
                <ContactLinksSection
                  projectId={projectId}
                  sub={Object.keys(links).length > 0}
                />
              }
            />
          </>
        }
        // Before « Qui produit ? », the project's own facts (proto).
        facts={
          organized
            ? [...sheetFacts(data), ...(release ? [release] : [])]
            : undefined
        }
      />
      <SheetNotices data={data} />
      {started && (
        <PathNowCard
          steps={steps}
          viewerName={viewer}
          moduleLabel={fr.shell.project.marketingSteps.production}
          labels={fr.productionJourney.now}
          elsewhere={elsewhereOf(journeys, steps)}
        />
      )}
      <ModuleAttention
        stepRef={productionStepRef(projectId, deliverableId, "organisation")}
        modules={["production"]}
        steps={productionStepChoices(deliverableId, steps)}
      />
      <DeliverableBar
        projectId={projectId}
        current={deliverableId}
        journeys={journeys}
      />
      {started ? (
        <div className="grid items-start gap-6 min-[900px]:grid-cols-[300px_minmax(0,1fr)]">
          <JourneySpine
            steps={steps}
            title={fr.productionJourney.spine}
            footer={{
              href: routes.projectProductionStep(
                projectId,
                deliverableId,
                "history",
              ),
              label: fr.productionJourney.history,
            }}
          />
          <div className="min-w-0">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
