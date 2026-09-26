import { getPublicEnv } from "@/lib/env-public";

// Base URL of the app, used to build auth email links. Read from the
// environment, never from request headers (a client can forge them).
export function siteUrl(): string {
  return getPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}
