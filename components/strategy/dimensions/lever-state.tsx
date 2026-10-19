"use client";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { arbitrateLever } from "@/lib/strategy/actions/add-line";
import type { LeverLine } from "@/lib/strategy/dimension-levers";
import { leverStateTone } from "@/lib/ui/state-tones";

const t = fr.strategyDimensions;

type Lever = Extract<LeverLine, { kind: "lever" }>;

/**
 * A lever's state on its row (proto LSTATE): « Retenu », « À arbitrer »
 * with « Retenir » / « Ne pas retenir » for the owner, « Non retenu ».
 */
export function LeverState({
  projectId,
  lever,
  canEdit,
}: {
  projectId: string;
  lever: Lever;
  canEdit: boolean;
}) {
  const { pending, error, run } = useWriteSubmit(
    () => undefined,
    t.done.retained,
  );
  const decide = (retain: boolean) =>
    lever.action &&
    run(
      () => arbitrateLever(projectId, lever.action!, retain),
      retain ? t.done.retained : t.done.notRetained,
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      <StatusBadge tone={leverStateTone[lever.state]} size="sm">
        {t.lever[lever.state]}
      </StatusBadge>
      {canEdit && lever.action && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => decide(true)}
          >
            {t.lever.retain}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => decide(false)}
          >
            {t.lever.reject}
          </Button>
        </>
      )}
      <FieldError id={`lever-${lever.key}-error`}>
        {error ?? undefined}
      </FieldError>
    </span>
  );
}
