import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { requireApproved } from "@/lib/auth/dal";
import { isWorkflowLaunched, workflowGate } from "@/lib/plan/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";
import { masterJourney } from "@/lib/i18n/fr/master-journey";

// The tab says the project and the module (Sacha 05/11/2026): « Piégé ·
// Module · PDS OS » through the project layout's template.
export const metadata = { title: masterJourney.module };

// The Master waits for the Plan du Projet (docs/ARCHITECTURE.md § 6 ter):
// launched from the plan, or already begun before it existed. Every step
// below sits behind the same lock.
export default async function MasterLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/master">) {
  const { projectId } = await params;
  // Launched (the common case): no round of its own before the pages.
  const [, project, launched] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    isWorkflowLaunched(projectId, "master"),
  ]);
  if (launched) return children;
  const gate = await workflowGate(project, "master");
  if (gate) return <WorkflowLocked projectId={projectId} gate={gate} />;
  return children;
}
