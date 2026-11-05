import { WorkflowGate } from "@/components/plan/workflow-gate";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";

// The tab says the project and the module (Sacha 05/11/2026): « Piégé ·
// Module · PDS OS » through the project layout's template.
export const metadata = { title: reviewJourney.module };

// Marketing › Suivi & bilan (proto « Projet complet »): a journey of three
// steps, Bilan provisoire, Réserves, Clôture du Marketing, each its own URL
// (lib/ui/review-steps.ts), under « Où on en est ». The module waits for the
// Plan du projet like every workflow. Pages check access themselves.
export default async function MarketingReviewLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/review">) {
  const { projectId } = await params;
  return (
    <WorkflowGate projectId={projectId} workflow="review">
      {children}
    </WorkflowGate>
  );
}
