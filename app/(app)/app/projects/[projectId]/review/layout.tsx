import { WorkflowGate } from "@/components/plan/workflow-gate";

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
