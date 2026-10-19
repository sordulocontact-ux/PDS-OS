import { BilanStep } from "@/components/marketing/review/journey/bilan-step";
import { ReviewStepFrame } from "@/components/marketing/review/journey/review-step-frame";
import { fr } from "@/lib/i18n/fr";
import { reviewJourneyContext } from "@/lib/marketing/review/context";

export const metadata = {
  title: `${fr.reviewJourney.steps.bilan.title} · ${fr.app.name}`,
};

/** Marketing › Suivi & bilan › Bilan provisoire (proto `bi1`). */
export default async function ReviewBilanPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/review/bilan">) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const ctx = await reviewJourneyContext(projectId);
  return (
    <ReviewStepFrame projectId={projectId} stepKey="bilan" query={query}>
      <BilanStep ctx={ctx} />
    </ReviewStepFrame>
  );
}
