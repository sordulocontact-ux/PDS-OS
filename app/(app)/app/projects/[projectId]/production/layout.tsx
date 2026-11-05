import { WorkflowGate } from "@/components/plan/workflow-gate";
import { production } from "@/lib/i18n/fr/production";

// The tab says the project and the module (Sacha 05/11/2026): « Piégé ·
// Module · PDS OS » through the project layout's template.
export const metadata = { title: production.title };

// Production waits for the Plan du projet (lot 2 « Projet complet »): every
// workflow starts at « Lancer le plan », after the Cadrage.
export default async function ProductionGateLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/production">) {
  const { projectId } = await params;
  return (
    <WorkflowGate projectId={projectId} workflow="production">
      {children}
    </WorkflowGate>
  );
}
