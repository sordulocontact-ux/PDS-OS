import { BriefDrift } from "@/components/plan/brief-drift";
import { ProjectPlanSection } from "@/components/plan/project-plan-section";
import type { Access } from "@/lib/auth/access";
import { briefDrift } from "@/lib/framing/brief-drift";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import { proposePlan } from "@/lib/plan/propose";
import { workflowsToReview } from "@/lib/plan/steps";
import type { WorkflowStates } from "@/lib/workflow-status/load";

/**
 * The Plan du projet to build and launch, still on the overview (`#plan`,
 * routes.projectPlan) until the zone Cadrage makes it the Cadrage's fourth
 * step (proto « Projet complet »); it then leaves this page. Shown once the
 * Brief is validated, before « Lancer le plan ».
 */
export async function PlanToLaunch({
  projectId,
  access,
  flows,
  canEdit,
}: {
  projectId: string;
  access: Access;
  flows: WorkflowStates | null;
  canEdit: boolean;
}) {
  const knowledge = await loadFramingKnowledge(projectId, access);
  if (!knowledge) return null;
  const drift = briefDrift(knowledge);
  const target = knowledge.framing.briefRows.find(
    (r) => r.field_key === "target_date" && r.status === "confirmed",
  )?.value;
  return (
    <>
      <BriefDrift projectId={projectId} changes={drift} />
      <ProjectPlanSection
        projectId={projectId}
        canEdit={canEdit}
        proposal={
          flows
            ? {
                items: proposePlan(knowledge),
                members: knowledge.framing.members,
                context: {
                  states: flows.states,
                  targetDate: typeof target === "string" ? target : null,
                  review: Object.fromEntries(workflowsToReview(drift)),
                  dependencies: flows.dependencies,
                },
              }
            : null
        }
      />
    </>
  );
}
