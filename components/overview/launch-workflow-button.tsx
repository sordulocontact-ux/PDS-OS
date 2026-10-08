"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { launchPlanWorkflow } from "@/lib/plan/actions";

/** « Lancer » on a workflow card not started yet: the same action as the
 * launched Plan du projet's « Lancer maintenant » (launch_plan_workflow). */
export function LaunchWorkflowButton({
  projectId,
  workflow,
}: {
  projectId: string;
  workflow: "strategy" | "master" | "legal";
}) {
  const { pending, run } = useFramingAction();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => run(() => launchPlanWorkflow(projectId, workflow))}
    >
      {fr.workflowStatus.board.launch}
    </Button>
  );
}
