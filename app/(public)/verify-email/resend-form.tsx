"use client";

import { useActionState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { resendConfirmation } from "@/lib/auth/actions";
import { idleFormState, retained } from "@/lib/auth/form-state";
import { fr } from "@/lib/i18n/fr";

export function ResendForm() {
  const [state, action] = useActionState(resendConfirmation, idleFormState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <Field
        name="email"
        type="email"
        label={fr.auth.fields.email}
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={retained(state, "email")}
        error={errors.email}
      />
      {state.status === "error" && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      {state.status === "success" && (
        <FormMessage kind="info">{state.message}</FormMessage>
      )}
      <SubmitButton
        variant="outline"
        pendingLabel={fr.auth.verifyEmail.resending}
      >
        {fr.auth.verifyEmail.resend}
      </SubmitButton>
    </form>
  );
}
