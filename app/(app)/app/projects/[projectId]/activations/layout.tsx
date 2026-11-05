import { WorkflowGate } from "@/components/plan/workflow-gate";
import { activations } from "@/lib/i18n/fr/activations";

// The tab says the project and the module (Sacha 05/11/2026): « Piégé ·
// Module · PDS OS » through the project layout's template.
export const metadata = { title: activations.title };

// Activations waits for the Plan du projet (lot 2 « Projet complet »): every
// workflow starts at « Lancer le plan », after the Cadrage.
export default async function ActivationsGateLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/activations">) {
  const { projectId } = await params;
  return (
    <WorkflowGate projectId={projectId} workflow="activations">
      {children}
    </WorkflowGate>
  );
}
