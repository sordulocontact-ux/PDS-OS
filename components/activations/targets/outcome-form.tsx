"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { TARGET_OUTCOMES, type TargetOutcome } from "@/lib/activations/model";
import { setTargetOutcome } from "@/lib/activations/target-actions";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations, activationWork };

const t = fr.activationWork.targets;
const OPEN = "open";

function OutcomeForm({
  projectId,
  targetId,
  outcome,
  press,
  onDone,
}: {
  projectId: string;
  targetId: string;
  outcome: TargetOutcome | null;
  press: boolean;
  onDone: () => void;
}) {
  const [choice, setChoice] = useState<string>(outcome ?? "closed");
  const { pending, error, run } = useWriteSubmit(onDone, t.outcomeSaved);
  const outcomes = TARGET_OUTCOMES.filter((o) =>
    press ? o !== "dispute" : o !== "declined",
  );
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const reason = String(
          new FormData(event.currentTarget).get("reason") ?? "",
        );
        run(() =>
          setTargetOutcome({
            projectId,
            targetId,
            outcome: choice === OPEN ? null : (choice as TargetOutcome),
            reason,
          }),
        );
      }}
    >
      <OptionSelect
        name="outcome"
        label={t.outcome}
        required
        items={{
          ...(outcome ? { [OPEN]: t.reopenOutcome } : {}),
          ...Object.fromEntries(outcomes.map((o) => [o, t.outcomes[o]])),
        }}
        defaultValue={choice}
        onValueChange={setChoice}
      />
      {choice !== OPEN && (
        <TextareaField
          name="reason"
          label={t.outcomeReason}
          rows={2}
          maxLength={1000}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.setOutcome}
        </Button>
      </div>
    </form>
  );
}

/** « Fixer l'issue » of a collaboration or a press target, or reopen it. */
export function OutcomeButton(props: {
  projectId: string;
  targetId: string;
  outcome: TargetOutcome | null;
  press: boolean;
}) {
  return (
    <DialogButton
      label={t.setOutcome}
      title={t.outcomeTitle}
      description={t.outcomeDescription}
    >
      {(close) => <OutcomeForm {...props} onDone={close} />}
    </DialogButton>
  );
}
