import { fr } from "@/lib/i18n/fr";

// Maps Supabase errors to controlled French messages.
// A raw Supabase message never reaches the screen.

const e = fr.auth.errors;

type ErrorLike =
  { code?: string | null; message?: string | null } | null | undefined;

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: e.invalidCredentials,
  email_not_confirmed: e.emailNotConfirmed,
  over_email_send_rate_limit: e.rateLimit,
  over_request_rate_limit: e.rateLimit,
  weak_password: e.weakPassword,
  same_password: e.samePassword,
  otp_expired: e.linkInvalid,
  validation_failed: e.invalidEmail,
};

export function authErrorMessage(error: ErrorLike): string {
  return AUTH_MESSAGES[error?.code ?? ""] ?? e.generic;
}

// Refusals raised by our own triggers carry their name in the message; RLS
// refusals carry a PostgreSQL privilege code.
const DATABASE_MESSAGES: Array<[needle: string, message: string]> = [
  ["person_has_no_account", e.personHasNoAccount],
  ["person_has_account", e.personHasAccount],
  ["invalid_role", e.invalidRole],
  ["invalid_invitation", e.required],
  ["last_usable_admin", e.lastUsableAdmin],
  ["email_change_forbidden", e.emailChangeForbidden],
  ["bootstrap_locked", e.forbidden],
  ["membership_events_immutable", e.forbidden],
];

const PERMISSION_CODES = new Set(["42501", "PGRST301"]);

export function databaseErrorMessage(error: ErrorLike): string {
  const message = error?.message ?? "";
  for (const [needle, translated] of DATABASE_MESSAGES) {
    if (message.includes(needle)) return translated;
  }
  if (error?.code && PERMISSION_CODES.has(error.code)) return e.forbidden;
  return e.generic;
}

export function isEmailNotConfirmed(error: ErrorLike): boolean {
  return error?.code === "email_not_confirmed";
}
