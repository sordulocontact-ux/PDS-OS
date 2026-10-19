import { WorkflowGate } from "@/components/plan/workflow-gate";

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
