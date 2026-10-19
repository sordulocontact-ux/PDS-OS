import { WorkflowGate } from "@/components/plan/workflow-gate";

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
