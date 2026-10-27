"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { signIn } from "@/lib/auth/actions";
import { idleFormState, retained } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action] = useActionState(signIn, idleFormState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const formError = state.status === "error" ? state.formError : initialError;
  const showResend = state.status === "error" && state.hint === "resend";

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
      <Field
        name="password"
        type="password"
        label={fr.auth.fields.password}
        autoComplete="current-password"
        required
        error={errors.password}
      />

      {formError && (
        <FormMessage kind="error">
          {formError}
          {showResend && (
            <>
              {" "}
              <Link
                href={routes.verifyEmail}
                className="font-medium underline underline-offset-4"
              >
                {fr.auth.login.resendLink}
              </Link>
            </>
          )}
        </FormMessage>
      )}

      <SubmitButton pendingLabel={fr.auth.login.submitting}>
        {fr.auth.login.submit}
      </SubmitButton>
    </form>
  );
}
