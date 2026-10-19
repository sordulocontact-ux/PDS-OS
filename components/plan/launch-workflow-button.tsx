"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fr } from "@/lib/i18n/fr";
import { launchPlanWorkflow } from "@/lib/plan/actions";
import type { PlanWorkflow } from "@/lib/plan/propose";

/** « Lancer » on a workflow card not started yet: the same action as the
 * launched Plan du projet's « Lancer maintenant » (launch_plan_workflow),
 * confirmed first with what starts and who pilots it; the launch is recorded
 * in the plan's history (PROJ-UX-07). */
export function LaunchWorkflowButton({
  projectId,
  workflow,
  pilot,
}: {
  projectId: string;
  workflow: PlanWorkflow;
  pilot: string | null;
}) {
  const t = fr.planSteps.launchOne;
  const name = fr.framingIntel.plan.workflows[workflow];
  const { pending, run, error, clearError } = useFramingAction({
    inline: true,
  });
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {fr.workflowStatus.board.launch}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          clearError();
          setOpen(next);
        }}
        title={t.title(name)}
        description={t.body(name, pilot ?? fr.framingIntel.plan.noOwner)}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={fr.workflowStatus.board.launch}
        pendingLabel={fr.framingIntel.plan.launching}
        pending={pending}
        error={error}
        onConfirm={() =>
          run(
            () => launchPlanWorkflow(projectId, workflow),
            () => setOpen(false),
          )
        }
      />
    </>
  );
}
