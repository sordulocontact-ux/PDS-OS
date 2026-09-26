import { routes } from "@/lib/auth/redirects";
import { getPublicEnv } from "@/lib/env-public";

// Base URL of the app, used to build auth email links. Read from the
// environment, never from request headers (a client can forge them).
export function siteUrl(): string {
  return getPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}

// Sign-up link shared by the director after creating an account: the address
// is prefilled, the person only chooses a password.
export function signupUrl(email: string): string {
  return `${siteUrl()}${routes.signup}?email=${encodeURIComponent(email)}`;
}
