"use client";

import { FieldError } from "@/components/auth/form-message";
import { DimensionConfirm } from "@/components/ui/dimension-list";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { confirmDesignTargetProposals } from "@/lib/design/actions/consolidation";
import { designSteps } from "@/lib/i18n/fr/design-steps";

const fr = { designSteps };

const t = fr.designSteps.intentions.confirmGroup;

/**
 * « Confirmer les n » at the foot of a section of the Intentions (the
 * release's direction or a deliverable; Sacha, 10/11/2026), as the
 * Cadrage's and the Stratégie's: PO's proposals, read, kept together with
 * their words.
 */
export function ConfirmIntentionGroup({
  projectId,
  target,
  count,
}: {
  projectId: string;
  // « direction », or the deliverable's id.
  target: string;
  count: number;
}) {
  const { pending, error, run } = useWriteSubmit(undefined, t.done(count));
  return (
    <DimensionConfirm
      label={t.label(count)}
      pendingLabel={t.pending}
      hint={t.hint(count)}
      pending={pending}
      onConfirm={() =>
        run(() => confirmDesignTargetProposals(projectId, target))
      }
    >
      {error && <FieldError id={`confirm-${target}-error`}>{error}</FieldError>}
    </DimensionConfirm>
  );
}
