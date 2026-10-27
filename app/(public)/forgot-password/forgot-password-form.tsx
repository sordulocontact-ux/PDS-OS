"use client";

import { useActionState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { requestPasswordReset } from "@/lib/auth/actions";
import { idleFormState, retained } from "@/lib/auth/form-state";
import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, idleFormState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (state.status === "success") {
    return <FormMessage kind="info">{state.message}</FormMessage>;
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
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
      <SubmitButton pendingLabel={fr.auth.forgotPassword.submitting}>
        {fr.auth.forgotPassword.submit}
      </SubmitButton>
    </form>
  );
}
