"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { idleFormState } from "@/lib/auth/form-state";
import { fr } from "@/lib/i18n/fr";
import { respondToAssignment } from "@/lib/projects/transmission-actions";

type Mode = "choose" | "refused" | "clarification_requested";

// The project manager's answer: accept (launches the project), refuse, or ask
// for a clarification. The last two require a message for the director.
export function RespondPanel({ assignmentId }: { assignmentId: string }) {
  const t = fr.transmission.respond;
  const [state, action] = useActionState(respondToAssignment, idleFormState);
  const [mode, setMode] = useState<Mode>("choose");
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <div className="flex flex-col gap-3">
      {mode === "choose" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <form action={action}>
            <input type="hidden" name="assignmentId" value={assignmentId} />
            <input type="hidden" name="decision" value="accepted" />
            <SubmitButton pendingLabel={t.accepting} className="w-full">
              {t.accept}
            </SubmitButton>
          </form>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setMode("clarification_requested")}
          >
            {t.clarify}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setMode("refused")}>
            {t.refuse}
          </Button>
        </div>
      ) : (
        <form action={action} noValidate className="flex flex-col gap-3">
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="decision" value={mode} />
          <TextareaField
            name="response"
            label={mode === "refused" ? t.refuseLabel : t.clarifyLabel}
            hint={t.responseHint}
            required
            autoFocus
            maxLength={5000}
            defaultValue={values.response ?? ""}
            error={errors.response}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setMode("choose")}
            >
              {t.cancel}
            </Button>
            <SubmitButton pendingLabel={t.sending}>{t.send}</SubmitButton>
          </div>
        </form>
      )}
      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
    </div>
  );
}
