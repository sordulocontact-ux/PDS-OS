import { redirect } from "next/navigation";

import { reviewEntry } from "@/lib/journey/landing";
import { reviewJourneyContext } from "@/lib/marketing/review/context";

// The Suivi & bilan's entry (proto « Projet complet »): the step that waits
// for the person looking, else the one in progress, else the closing. The
// former dashboard is « Où on en est », on every step.
export default async function MarketingReviewPage({
  params,
}: PageProps<"/app/projects/[projectId]/review">) {
  const { projectId } = await params;
  const { steps } = await reviewJourneyContext(projectId);
  redirect(reviewEntry(projectId, steps));
}
