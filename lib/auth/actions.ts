"use server";

import { redirect } from "next/navigation";

import { fetchAccess } from "@/lib/auth/access";
import { authErrorMessage, isEmailNotConfirmed } from "@/lib/auth/errors";
import type { FormState } from "@/lib/auth/form-state";
import { destinationFor, routes } from "@/lib/auth/redirects";
import {
  emailOnlySchema,
  parseForm,
  resetPasswordSchema,
  retainedValues,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/schemas";
import { siteUrl } from "@/lib/auth/site-url";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Every authentication operation goes through here, on the server.

const t = fr.auth;

function confirmUrl(): string {
  return `${siteUrl()}${routes.authConfirm}`;
}

const RATE_LIMIT_CODES = new Set([
  "over_email_send_rate_limit",
  "over_request_rate_limit",
]);

export async function signUp(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(signUpSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values: parsed.values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: confirmUrl(),
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
      },
    },
  });

  // An address already in use gets the same screen: no email enumeration.
  // Only truly blocking errors are shown.
  if (
    error &&
    (RATE_LIMIT_CODES.has(error.code ?? "") || error.code === "weak_password")
  ) {
    return {
      status: "error",
      formError: authErrorMessage(error),
      values: retainedValues(formData),
    };
  }
  if (
    error &&
    error.code !== "user_already_exists" &&
    error.code !== "email_exists"
  ) {
    console.error("signUp:", error.code, error.message);
    return {
      status: "error",
      formError: t.errors.generic,
      values: retainedValues(formData),
    };
  }

  // Email confirmation disabled (auth autoconfirm): the session is already
  // open, so go straight to where the access state is displayed.
  if (data.session) {
    const access = await fetchAccess(supabase);
    redirect(destinationFor(access.state));
  }

  redirect(routes.verifyEmail);
}

export async function signIn(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(signInSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values: parsed.values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      formError: authErrorMessage(error),
      hint: isEmailNotConfirmed(error) ? "resend" : undefined,
      values: retainedValues(formData),
    };
  }

  const access = await fetchAccess(supabase);
  redirect(destinationFor(access.state));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.home);
}

export async function resendConfirmation(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(emailOnlySchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      values: parsed.values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: confirmUrl() },
  });

  if (error && RATE_LIMIT_CODES.has(error.code ?? "")) {
    return {
      status: "error",
      formError: authErrorMessage(error),
      values: retainedValues(formData),
    };
  }

  // Same message whether the address exists or not.
  return { status: "success", message: t.verifyEmail.resent };
}

export async function requestPasswordReset(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseForm(emailOnlySchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      values: parsed.values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: confirmUrl() },
  );

  if (error && RATE_LIMIT_CODES.has(error.code ?? "")) {
    return {
      status: "error",
      formError: authErrorMessage(error),
      values: retainedValues(formData),
    };
  }

  // Same message whether the address exists or not.
  return { status: "success", message: t.forgotPassword.sent };
}

export async function updatePassword(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  // Both fields are passwords: nothing is sent back to the screen.
  const parsed = parseForm(resetPasswordSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", formError: authErrorMessage(error) };
  }

  const access = await fetchAccess(supabase);
  redirect(destinationFor(access.state));
}
