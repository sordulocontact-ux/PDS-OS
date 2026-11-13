import "server-only";

import type { GoogleService } from "@/lib/google/services";
import { IntegrationError } from "@/lib/integrations/http";

/**
 * What both ways into a member's Google account share (docs/ARCHITECTURE.md
 * § 4 quater): the domain's delegation (google-workspace.ts) and an account
 * the member connected (google-connect.ts). One read-only scope per service.
 */

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GOOGLE_SCOPE: Record<GoogleService, string> = {
  calendar: "https://www.googleapis.com/auth/calendar.readonly",
  gmail: "https://www.googleapis.com/auth/gmail.readonly",
  drive: "https://www.googleapis.com/auth/drive.readonly",
};

// The lightest read that proves the service answers for this account.
const PROBE: Record<GoogleService, string> = {
  calendar:
    "https://www.googleapis.com/calendar/v3/calendars/primary?fields=id",
  gmail: "https://gmail.googleapis.com/gmail/v1/users/me/profile",
  drive: "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)",
};

export type ProbeResult = "connected" | "not_set" | "refused" | "unreachable";

/**
 * Whether `service` answers with the token `getToken` gives: one light read.
 * Never throws: an IntegrationError's reason is the answer.
 */
export async function probeGoogleService(
  service: GoogleService,
  getToken: () => Promise<string>,
): Promise<ProbeResult> {
  try {
    const token = await getToken();
    const response = await fetch(PROBE[service], {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) return "connected";
    // 403: the API is not enabled in the project, or the scope is missing.
    console.error(`google: probe ${service} ${response.status}`);
    return response.status >= 500 ? "unreachable" : "refused";
  } catch (error) {
    if (
      error instanceof IntegrationError &&
      (error.reason === "not_set" || error.reason === "refused")
    )
      return error.reason;
    return "unreachable";
  }
}

/** Google's token endpoint, its refusal logged with its reason (never
 * shown): `refused` for a 4xx, `unreachable` otherwise. */
export async function postGoogleToken(
  service: string,
  body: URLSearchParams,
): Promise<{
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}> {
  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new IntegrationError(service, "unreachable");
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    console.error(`${service}: token ${response.status} ${error?.error ?? ""}`);
    throw new IntegrationError(
      service,
      response.status >= 500 ? "unreachable" : "refused",
    );
  }
  return response.json();
}
