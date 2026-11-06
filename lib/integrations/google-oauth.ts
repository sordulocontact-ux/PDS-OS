import "server-only";

import { getServerEnv } from "@/lib/env";
import { IntegrationError } from "@/lib/integrations/http";

/**
 * The organizer's Google account (po@pdsrecords.com), shared by every Google
 * API PDS OS calls: Calendar (google-calendar.ts) and Meet (google-meet.ts).
 * Server-side only, from its OAuth refresh token (GOOGLE_CALENDAR_*), never
 * exposed to the browser. What the token may do depends on the scopes granted
 * when it was made (scripts/google-calendar-token.mjs, docs/ARCHITECTURE.md
 * § 4 bis): a call to an API it was not granted answers 403.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export type GoogleSettings = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
};

export function googleSettings(): GoogleSettings | null {
  const env = getServerEnv();
  if (
    !env.GOOGLE_CALENDAR_CLIENT_ID ||
    !env.GOOGLE_CALENDAR_CLIENT_SECRET ||
    !env.GOOGLE_CALENDAR_REFRESH_TOKEN
  )
    return null;
  return {
    clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
    refreshToken: env.GOOGLE_CALENDAR_REFRESH_TOKEN,
    calendarId: env.GOOGLE_CALENDAR_ID ?? "primary",
  };
}

// An access token lasts about an hour: kept by the server instance.
let cached: { token: string; expiresAt: number } | null = null;

export async function googleAccessToken(
  config: GoogleSettings,
): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new IntegrationError("google_oauth", "unreachable");
  }
  if (!response.ok)
    throw new IntegrationError("google_oauth", `token_${response.status}`);
  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token)
    throw new IntegrationError("google_oauth", "token_missing");
  cached = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}
