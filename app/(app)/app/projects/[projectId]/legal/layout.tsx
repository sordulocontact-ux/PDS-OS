import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { isWorkflowLaunched, workflowGate } from "@/lib/plan/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";
import { shell } from "@/lib/i18n/fr/shell";

// The tab says the project and the module (Sacha 05/11/2026): « Piégé ·
// Module · PDS OS » through the project layout's template.
export const metadata = { title: shell.project.sidebar.legal };

// The Juridique waits for the Plan du Projet (docs/ARCHITECTURE.md § 6 ter):
// launched from the plan, or already begun before it existed. Every step
// below sits behind the same lock.
export default async function LegalLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/legal">) {
  const { projectId } = await params;
  // Launched (the common case): no round of its own before the pages.
  const [access, project, launched] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    isWorkflowLaunched(projectId, "legal"),
  ]);
  // Without manage_legal, the page itself answers 404.
  if (!can(access, "manage_legal")) return children;
  if (launched) return children;
  const gate = await workflowGate(project, "legal");
  if (gate) return <WorkflowLocked projectId={projectId} gate={gate} />;
  return children;
}
