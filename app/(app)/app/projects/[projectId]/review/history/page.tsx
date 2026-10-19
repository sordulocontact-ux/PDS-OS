import { MarketingHistory } from "@/components/marketing/marketing-history";
import { ProjectHeader } from "@/components/projects/project-header";
import { BackLink } from "@/components/shell/back-link";
import { fr } from "@/lib/i18n/fr";
import { loadMarketingEvents } from "@/lib/marketing/queries";
import { reviewJourneyContext } from "@/lib/marketing/review/context";
import { reviewStepHref } from "@/lib/ui/review-steps";

const t = fr.reviewJourney.history;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

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
      />
      <BackLink href={reviewStepHref(projectId, "bilan")}>
        {fr.reviewJourney.module}
      </BackLink>
      <h2 className="text-[length:var(--type-figure-lg)] leading-[var(--type-figure-lg-lh)] font-medium">
        {t.title}
      </h2>
      <MarketingHistory events={events} emptyLabel={t.empty} />
    </div>
  );
}
