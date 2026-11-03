"use client";

import { toast } from "@/components/ui/toast";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { requestValidation } from "@/lib/framing/actions/validation";
import { framing } from "@/lib/i18n/fr/framing";

const fr = { framing };

/**
 * "Demander la validation": no validator to pick (there is one, resolved by
 * the database), so this is a single action, not a form. `note` is read once
 * at click time (an uncontrolled input the caller owns), never as React
 * state here, so the same button works whether the caller offers a note
 * field (ValidationPanel's aside) or not (the project header).
 */
export function RequestValidationButton({
  projectId,
  stageId,
  size,
  getNote,
}: {
  projectId: string;
  stageId: string;
  size?: "default" | "sm" | "lg";
  /** Reads the note at submit time; omit where there is no note field. */
  getNote?: () => string;
}) {
  const t = fr.framing.validation;
  const { pending, run } = useFramingAction();

  return (
    <Button
      size={size}
      disabled={pending}
      onClick={() =>
        run(
          () => requestValidation(projectId, stageId, getNote?.() ?? ""),
          () => toast.success(t.requested),
        )
      }
    >
      {t.request}
    </Button>
  );
}
