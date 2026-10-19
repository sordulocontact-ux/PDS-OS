import { redirect } from "next/navigation";

import { reviewStepHref } from "@/lib/ui/review-steps";

// The former « Rapports » tab: the versions are in the step « Bilan
// provisoire » now (proto « Projet complet »).
export default async function MarketingReportsPage({
  params,
}: PageProps<"/app/projects/[projectId]/review/reports">) {
  const { projectId } = await params;
  redirect(reviewStepHref(projectId, "bilan"));
}
