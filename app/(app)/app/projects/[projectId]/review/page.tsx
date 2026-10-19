import { redirect } from "next/navigation";

import { reviewJourneyContext } from "@/lib/marketing/review/context";
import { reviewStepHref } from "@/lib/ui/review-steps";

// The Suivi & bilan's entry (proto « Projet complet »): the step that waits
// for the person looking, else the one in progress, else the closing. The
// former dashboard is « Où on en est », on every step.
export default async function MarketingReviewPage({
  params,
}: PageProps<"/app/projects/[projectId]/review">) {
  const { projectId } = await params;
  const { steps } = await reviewJourneyContext(projectId);
  const entry =
    steps.find((s) => s.actor?.viewer) ??
    steps.find((s) => s.status === "current" || s.status === "waiting") ??
    steps[steps.length - 1];
  redirect(reviewStepHref(projectId, entry.key));
}
