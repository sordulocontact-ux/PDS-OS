import { ProjectHeader } from "@/components/projects/project-header";
import {
  SheetKindBadge,
  SheetNotices,
  sheetFacts,
} from "@/components/production/prep/sheet-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { PathNowCard } from "@/components/shell/journey/path-now-card";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { elsewhereOf, loadProjectJourneys } from "@/lib/journey/project";
import { journeyContext } from "@/lib/production/journey/context";

// One deliverable's production as a journey (Ibé, 14/10): the module's head
// (trail « Projet › Marketing › Production › livrable › étape », who
// produces, what frames it), « Maintenant » for the person looking, then the
// steps on the left and the open step on the right — one page per step.
// Pages check access themselves; everything is read once per request
// (journeyContext is cached).
export default async function ProductionSheetLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/production/[deliverableId]">) {
  const { projectId, deliverableId } = await params;
  const [{ access, data, steps }, journeys] = await Promise.all([
    journeyContext(projectId, deliverableId),
    loadProjectJourneys(projectId),
  ]);
  const started = Boolean(data.heritage.fiche || data.heritage.source);
  const viewer =
    data.members.find((m) => m.personId === access.personId)?.name ?? null;
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
        actions={<SheetKindBadge data={data} />}
        facts={sheetFacts(data)}
      />
      <SheetNotices data={data} />
      {started && (
        <PathNowCard
          steps={steps}
          viewerName={viewer}
          moduleLabel={`${fr.shell.project.marketingSteps.production} › ${data.deliverable.title}`}
          labels={fr.productionJourney.now}
          elsewhere={elsewhereOf(journeys, steps)}
        />
      )}
      {started ? (
        <div className="grid items-start gap-6 min-[900px]:grid-cols-[300px_minmax(0,1fr)]">
          <JourneySpine
            steps={steps}
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
