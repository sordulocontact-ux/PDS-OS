"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { StatusBadge } from "@/components/ui/status-badge";
import { stageTreatment } from "@/lib/ui/state-treatments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  decideValidation,
  requestValidation,
  startStage,
} from "@/lib/framing/actions/validation";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";

type Props = Pick<FramingData, "stage" | "pendingValidation" | "members"> & {
  projectId: string;
  mePersonId: string | null;
  /** Per stage: "Validation du Brief", "Commencer le cadrage"… */
  title: string;
  startLabel: string;
  /** Why the stage cannot start yet (the database refuses it anyway). */
  startBlocked?: string | null;
};
type StageState = keyof typeof fr.framing.validation.states;

/** A stage's state machine (framing, strategy), driven by database functions. */
export function ValidationPanel({
  stage,
  pendingValidation,
  members,
  projectId,
  mePersonId,
  title,
  startLabel,
  startBlocked,
}: Props) {
  const t = fr.framing.validation;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const others = members.filter((m) => m.personId !== mePersonId);
  const [validator, setValidator] = useState(
    others[0]?.personId ?? members[0]?.personId ?? "",
  );
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  if (!stage) return null;
  const state = stage.state as StageState;

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <StatusBadge treatment={stageTreatment[state]}>
          {t.states[state]}
        </StatusBadge>
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

      {canEdit && state === "in_progress" && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => requestValidation(projectId, stage.id, validator, note),
              () => setNote(""),
            );
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="validator">{t.validator}</Label>
            <OptionSelect
              id="validator"
              label={t.validator}
              value={validator}
              onChange={setValidator}
              options={Object.fromEntries(
                members.map((m) => [m.personId, m.name]),
              )}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="validation-note">{t.note}</Label>
            <Input
              id="validation-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="justify-self-start"
            disabled={pending || !validator}
          >
            {t.request}
          </Button>
        </form>
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
    </section>
  );
}
