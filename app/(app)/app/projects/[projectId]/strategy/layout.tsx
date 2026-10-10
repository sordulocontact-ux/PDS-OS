import { WorkflowLocked } from "@/components/plan/workflow-locked";
import { StrategyNeedsFraming } from "@/components/strategy/strategy-needs-framing";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { workflowGate } from "@/lib/plan/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isFramingValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

/**
 * Every page of the Strategy (pilot, Brief de sortie, documents, follow-up)
 * waits for the validated Cadrage, then for the Plan du Projet.
 */
export default async function StrategyLayout({
  params,
  children,
}: LayoutProps<"/app/projects/[projectId]/strategy">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!isFramingValidated(project.stages))
    return (
      <StrategyNeedsFraming
        projectId={projectId}
        canEdit={canEditProject(access, project)}
      />
    );
  const gate = await workflowGate(project, "strategy");
  if (gate)
    return (
      <WorkflowLocked
        projectId={projectId}
        name={fr.framingIntel.plan.workflows.strategy}
        {...gate}
      />
    );
  return children;
}
