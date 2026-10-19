import { ClosureStep } from "@/components/marketing/review/journey/closure-step";
import { ReviewStepFrame } from "@/components/marketing/review/journey/review-step-frame";
import { fr } from "@/lib/i18n/fr";
import { reviewJourneyContext } from "@/lib/marketing/review/context";

export const metadata = {
  title: `${fr.reviewJourney.steps.closure.title} · ${fr.app.name}`,
};

/**
 * Marketing › Suivi & bilan › Clôture du Marketing (proto `bi3`): asked by
 * the responsible, decided by the direction, reopened with a reason. The
 * whole project's closing is apart (/closure, from the Vue d'ensemble).
 */
export default async function ReviewClosurePage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/review/closure">) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const ctx = await reviewJourneyContext(projectId);
  return (
    <ReviewStepFrame projectId={projectId} stepKey="closure" query={query}>
      <ClosureStep ctx={ctx} />
    </ReviewStepFrame>
  );
}
