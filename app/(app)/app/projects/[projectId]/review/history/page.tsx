import { MarketingHistory } from "@/components/marketing/marketing-history";
import { ProjectHeader } from "@/components/projects/project-header";
import { fr } from "@/lib/i18n/fr";
import { loadMarketingEvents } from "@/lib/marketing/queries";
import { reviewJourneyContext } from "@/lib/marketing/review/context";

const t = fr.reviewJourney.history;

/** « Historique » at the foot of the journey: the Marketing's audit, one
 * block per day, written by the database's triggers. */
export default async function ReviewHistoryPage({
  params,
}: PageProps<"/app/projects/[projectId]/review/history">) {
  const { projectId } = await params;
  const { access, steps } = await reviewJourneyContext(projectId);
  const events = await loadMarketingEvents(projectId, access, { limit: 200 });
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        steps={steps}
        extraCrumbs={[{ label: t.link }]}
        // Its name as the title, the header's arrow back to the module
        // (Sacha 10/11/2026, like an activation's page).
        title={t.title}
      />
      <MarketingHistory events={events} emptyLabel={t.empty} />
    </div>
  );
}
