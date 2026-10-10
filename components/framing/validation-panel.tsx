"use client";

import { useRef, useState } from "react";

import { RequestValidationButton } from "@/components/framing/request-validation-button";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { StatusBadge } from "@/components/ui/status-badge";
import { stageTone } from "@/lib/ui/state-tones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decideValidation, startStage } from "@/lib/framing/actions/validation";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";

type Props = Pick<FramingData, "stage" | "pendingValidation"> & {
  projectId: string;
  mePersonId: string | null;
  /** Per stage: "Validation du Brief", "Commencer le cadrage"… */
  title: string;
  startLabel: string;
  /** Why the stage cannot start yet (the database refuses it anyway). */
  startBlocked?: string | null;
  /** Why the validation is not asked here (the Stratégie asks it from its
   * Brief de sortie, once complete): shown instead of the request. */
  requestBlocked?: React.ReactNode;
};
type StageState = keyof typeof fr.framing.validation.states;

/**
 * A stage's state machine (framing, strategy), driven by database functions.
 * Asking for a validation never picks a validator: the database resolves the
 * sole holder of "validate" itself (sole_validator).
 */
export function ValidationPanel({
  stage,
  pendingValidation,
  projectId,
  mePersonId,
  title,
  startLabel,
  startBlocked,
  requestBlocked,
}: Props) {
  const t = fr.framing.validation;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const noteRef = useRef<HTMLInputElement>(null);
  const [comment, setComment] = useState("");
  if (!stage) return null;
  const state = stage.state as StageState;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <StatusBadge tone={stageTone[state]}>{t.states[state]}</StatusBadge>
      </div>

      {/* A validated stage is final: it is never reopened. */}
      {canEdit && state === "not_started" && (
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-self-start"
            disabled={pending || Boolean(startBlocked)}
            aria-describedby={startBlocked ? "start-blocked" : undefined}
            onClick={() => run(() => startStage(projectId, stage.id))}
          >
            {startLabel}
          </Button>
          {startBlocked && (
            <p id="start-blocked" className="text-xs text-muted-foreground">
              {startBlocked}
            </p>
          )}
        </div>
      )}

      {canEdit && state === "in_progress" && requestBlocked && (
        <div className="text-sm text-muted-foreground">{requestBlocked}</div>
      )}

      {canEdit && state === "in_progress" && !requestBlocked && (
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label htmlFor="validation-note">{t.note}</Label>
            <Input id="validation-note" ref={noteRef} />
          </div>
          <RequestValidationButton
            projectId={projectId}
            stageId={stage.id}
            getNote={() => noteRef.current?.value ?? ""}
          />
        </div>
      )}

      {state === "awaiting_validation" && pendingValidation && (
        <div className="grid gap-2 text-sm">
          <p className="text-muted-foreground">
            {t.waitingFor(pendingValidation.validatorName)}
          </p>
          {pendingValidation.note && (
            <q className="text-xs">{pendingValidation.note}</q>
          )}
          {pendingValidation.validatorPersonId === mePersonId && (
            <div className="grid gap-2">
              <p className="font-medium">{t.youDecide}</p>
              <Label htmlFor="decision-comment">{t.comment}</Label>
              <Input
                id="decision-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      decideValidation(
                        projectId,
                        pendingValidation.id,
                        true,
                        comment,
                      ),
                    )
                  }
                >
                  {t.approve}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      decideValidation(
                        projectId,
                        pendingValidation.id,
                        false,
                        comment,
                      ),
                    )
                  }
                >
                  {t.decline}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
