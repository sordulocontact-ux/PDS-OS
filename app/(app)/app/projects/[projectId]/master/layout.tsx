import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { requireApproved } from "@/lib/auth/dal";
import { workflowGate } from "@/lib/plan/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

// The Master waits for the Plan du Projet (docs/ARCHITECTURE.md § 6 ter):
// launched from the plan, or already begun before it existed. Every step
// below sits behind the same lock.
export default async function MasterLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/master">) {
  const { projectId } = await params;
  const [, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const gate = await workflowGate(project, "master");
  if (gate) return <WorkflowLocked projectId={projectId} />;
  return children;
}
