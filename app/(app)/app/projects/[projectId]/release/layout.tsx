import { WorkflowGate } from "@/components/plan/workflow-gate";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

// The tab says the project and the module (Sacha 05/11/2026): « Piégé ·
// Module · PDS OS » through the project layout's template.
export const metadata = { title: distributionJourney.module };

// Distribution waits for the Plan du projet (lot 2 « Projet complet »): every
// workflow starts at « Lancer le plan », after the Cadrage.
export default async function ReleaseGateLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/release">) {
  const { projectId } = await params;
  return (
    <WorkflowGate projectId={projectId} workflow="distribution">
      {children}
    </WorkflowGate>
  );
}
