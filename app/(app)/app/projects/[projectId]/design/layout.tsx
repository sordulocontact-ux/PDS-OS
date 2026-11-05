import { WorkflowGate } from "@/components/plan/workflow-gate";
import { designJourney } from "@/lib/i18n/fr/design-journey";

// The tab says the project and the module (Sacha 05/11/2026): « Piégé ·
// Module · PDS OS » through the project layout's template.
export const metadata = { title: designJourney.module };

// Conception waits for the Plan du projet (lot 2 « Projet complet »): every
// workflow starts at « Lancer le plan », after the Cadrage.
export default async function DesignGateLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/design">) {
  const { projectId } = await params;
  return (
    <WorkflowGate projectId={projectId} workflow="design">
      {children}
    </WorkflowGate>
  );
}
