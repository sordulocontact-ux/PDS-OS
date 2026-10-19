import { WorkflowGate } from "@/components/plan/workflow-gate";

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
