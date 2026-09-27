"use client";

import { toast } from "sonner";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { decideValidation } from "@/lib/framing/actions/validation";
import { fr } from "@/lib/i18n/fr";

/**
 * "Valider et clôturer", for the validator only: approves the pending
 * request (decide_validation, in SQL). A validated Framing is final.
 */
export function ApproveButton({
  projectId,
  validationId,
}: {
  projectId: string;
  validationId: string;
}) {
  const { pending, run } = useFramingAction();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        run(
          () => decideValidation(projectId, validationId, true, ""),
          () => toast.success(fr.framingGuide.summary.approved),
        )
      }
    >
      {fr.framingGuide.summary.approve}
    </Button>
  );
}
