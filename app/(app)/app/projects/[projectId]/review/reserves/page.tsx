import { ReservesStep } from "@/components/marketing/review/journey/reserves-step";
import { ReviewStepFrame } from "@/components/marketing/review/journey/review-step-frame";
import { reviewJourneyContext } from "@/lib/marketing/review/context";

/** Marketing › Suivi & bilan › Réserves (proto `bi2`). */
export default async function ReviewReservesPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/review/reserves">) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const ctx = await reviewJourneyContext(projectId);
  return (
    <ReviewStepFrame projectId={projectId} stepKey="reserves" query={query}>
      <ReservesStep ctx={ctx} />
    </ReviewStepFrame>
  );
}
