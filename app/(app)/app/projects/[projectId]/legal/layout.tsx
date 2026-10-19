import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { workflowGate } from "@/lib/plan/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

// The Juridique waits for the Plan du Projet (docs/ARCHITECTURE.md § 6 ter):
// launched from the plan, or already begun before it existed. Every step
// below sits behind the same lock.
export default async function LegalLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/legal">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  // Without manage_legal, the page itself answers 404.
  if (!can(access, "manage_legal")) return children;
  const gate = await workflowGate(project, "legal");
  if (gate) return <WorkflowLocked projectId={projectId} />;
  return children;
}
