import { redirect } from "next/navigation";

import { reviewStepHref } from "@/lib/ui/review-steps";

// The former preparation page: « Préparer la version N » is in the step
// « Bilan provisoire » now (proto « Projet complet »).
export default async function PrepareMarketingReportPage({
  params,
}: PageProps<"/app/projects/[projectId]/review/reports/new">) {
  const { projectId } = await params;
  redirect(reviewStepHref(projectId, "bilan"));
}
