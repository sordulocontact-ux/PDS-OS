import { SheetHeader } from "@/components/production/prep/sheet-header";
import { JourneySpine } from "@/components/shell/journey/journey-spine";
import { NowCard } from "@/components/shell/journey/now-card";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { journeyContext } from "@/lib/production/journey/context";

// One deliverable's production as a journey (Ibé, 14/10): its header (who
// produces, what frames it), « Maintenant » for the person looking, then the
// steps on the left and the open step on the right — one page per step.
// Pages check access themselves; everything is read once per request
// (journeyContext is cached).
export default async function ProductionSheetLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/production/[deliverableId]">) {
  const { projectId, deliverableId } = await params;
  const { access, data, steps } = await journeyContext(
    projectId,
    deliverableId,
  );
  const started = Boolean(data.heritage.fiche || data.heritage.source);
  const viewer =
    data.members.find((m) => m.personId === access.personId)?.name ?? null;
  return (
    <div className="flex flex-col gap-6 pt-6">
      <SheetHeader projectId={projectId} data={data} />
      {started && (
        <NowCard
          steps={steps}
          viewerName={viewer}
          labels={fr.productionJourney.now}
        />
      )}
      {started ? (
        <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
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
