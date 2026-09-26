"use client";

import { useActionState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { signUp } from "@/lib/auth/actions";
import { idleFormState, retained } from "@/lib/auth/form-state";
import { fr } from "@/lib/i18n/fr";

export function SignUpForm() {
  const [state, action] = useActionState(signUp, idleFormState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="firstName"
          label={fr.auth.fields.firstName}
          autoComplete="given-name"
          required
          defaultValue={retained(state, "firstName")}
          error={errors.firstName}
        />
        <Field
          name="lastName"
          label={fr.auth.fields.lastName}
          autoComplete="family-name"
          defaultValue={retained(state, "lastName")}
          error={errors.lastName}
        />
      </div>
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

      {state.status === "error" && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}

      <SubmitButton pendingLabel={fr.auth.signup.submitting}>
        {fr.auth.signup.submit}
      </SubmitButton>
    </form>
  );
}
