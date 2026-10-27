"use client";

import { useActionState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { updatePassword } from "@/lib/auth/actions";
import { idleFormState } from "@/lib/auth/form-state";
import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, idleFormState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Field
        name="password"
        type="password"
        label={fr.auth.fields.password}
        autoComplete="new-password"
        required
        minLength={10}
        hint={fr.auth.fields.passwordHint}
        error={errors.password}
      />
      <Field
        name="passwordConfirm"
        type="password"
        label={fr.auth.fields.passwordConfirm}
        autoComplete="new-password"
        required
        error={errors.passwordConfirm}
      />
      {state.status === "error" && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      <SubmitButton pendingLabel={fr.auth.resetPassword.submitting}>
        {fr.auth.resetPassword.submit}
      </SubmitButton>
    </form>
  );
}
