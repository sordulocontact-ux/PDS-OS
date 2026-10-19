import { notFound } from "next/navigation";

import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { MARKETING_PARTS, type PlanWorkflow } from "@/lib/plan/propose";
import { workflowGate } from "@/lib/plan/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";
import { applicableWorkflows } from "@/lib/workflow-status/rules";

/**
 * A section that waits for the Plan du projet (proto « Projet complet »:
 * every workflow starts at « Lancer le plan », after the Cadrage): its
 * pages show WorkflowLocked until the plan is launched, unless the
 * workflow had begun before (workflow_is_launched). A journey lock, not a
 * security rule: the tables' RLS is unchanged.
 */
export async function WorkflowGate({
  projectId,
  workflow,
  children,
}: {
  projectId: string;
  workflow: PlanWorkflow;
  children: React.ReactNode;
}) {
  const [, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  // A workflow the project does not have (a content project has no
  // Distribution): no page, as the sidebar shows no entry (recette).
  if (
    workflow === "distribution" &&
    !applicableWorkflows({
      type: project.type,
      masterCount: project.masters.length,
    }).includes("distribution")
  )
    notFound();
  const gate = await workflowGate(project, workflow);
  const marketing = fr.shell.project.sidebar.marketing;
  if (gate)
    return (
      <WorkflowLocked
        projectId={projectId}
        title={MARKETING_PARTS.includes(workflow) ? marketing : undefined}
      />
    );
  return children;
}
