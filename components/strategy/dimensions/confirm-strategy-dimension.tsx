"use client";

import { FieldError } from "@/components/auth/form-message";
import { DimensionConfirm } from "@/components/ui/dimension-list";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { strategyDimensions } from "@/lib/i18n/fr/strategy-dimensions";
import { confirmStrategyDimension } from "@/lib/strategy/actions/lines";
import type { LineTarget } from "@/lib/strategy/actions/lines";

const fr = { strategyDimensions };

const t = fr.strategyDimensions;

/**
 * « Confirmer les n » under a dimension of the Stratégie (as the Cadrage's,
 * Sacha 06/11/2026): its proposals, read, kept together with their words;
 * the banner says it, and opens the validation when it was the last thing
 * left (withOutcome).
 */
export function ConfirmStrategyDimension({
  projectId,
  dimension,
  lines,
}: {
  projectId: string;
  dimension: string;
  // The proposals shown under it, still to decide.
  lines: LineTarget[];
}) {
  const { pending, error, run } = useWriteSubmit(undefined, t.done.kept);
  return (
    <DimensionConfirm
      label={t.confirmAll(lines.length)}
      pendingLabel={t.confirming}
      hint={t.confirmAllHint(lines.length)}
      pending={pending}
      onConfirm={() =>
        run(() => confirmStrategyDimension(projectId, dimension, lines))
      }
    >
      {error && (
        <FieldError id={`confirm-${dimension}-error`}>{error}</FieldError>
      )}
    </DimensionConfirm>
  );
}
