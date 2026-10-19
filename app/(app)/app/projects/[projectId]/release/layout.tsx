import { WorkflowGate } from "@/components/plan/workflow-gate";

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
