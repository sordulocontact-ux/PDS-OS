import "server-only";

import { siteUrl } from "@/lib/auth/site-url";
import { getServerEnv } from "@/lib/env";
import { GOOGLE_SERVICES } from "@/lib/google/services";
import { tokenSealReady, unsealGoogleToken } from "@/lib/google/token-seal";
import {
  GOOGLE_SCOPE,
  postGoogleToken,
} from "@/lib/integrations/google-member-api";
import { IntegrationError } from "@/lib/integrations/http";

/**
 * « Connecter un compte Google » (docs/ARCHITECTURE.md § 4 quater): any other
 * Google account a member adds themselves (Gmail perso…), through the « Web »
 * OAuth client GOOGLE_CONNECT_*, read-only. One consent covers Agenda, Gmail
 * and Drive; the refresh token is sealed (token-seal.ts) before it is stored.
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

const SCOPES = [
  "openid",
  "email",
  ...GOOGLE_SERVICES.map((service) => GOOGLE_SCOPE[service]),
];

function client() {
  const env = getServerEnv();
  if (!env.GOOGLE_CONNECT_CLIENT_ID || !env.GOOGLE_CONNECT_CLIENT_SECRET)
    return null;
  return {
    id: env.GOOGLE_CONNECT_CLIENT_ID,
    secret: env.GOOGLE_CONNECT_CLIENT_SECRET,
  };
}

/** Whether a member can connect an account (client and sealing key set). */
export const connectConfigured = () => client() !== null && tokenSealReady();

const redirectUri = () => `${siteUrl()}/api/google/callback`;

/** Google's consent page, asked for a refresh token (offline, consent). */
export function connectAuthorizeUrl(state: string, challenge: string): string {
  const config = client();
  if (!config) throw new IntegrationError("google_connect", "not_set");
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: config.id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

// The id token comes straight from Google's token endpoint over TLS: its
// claims are read, checked for this client and a verified address.
function emailOf(idToken: string | undefined, clientId: string): string {
  const payload = idToken?.split(".")[1];
  if (!payload) throw new IntegrationError("google_connect", "no_email");
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as { aud?: string; email?: string; email_verified?: boolean };
  if (claims.aud !== clientId || !claims.email || !claims.email_verified)
    throw new IntegrationError("google_connect", "no_email");
  return claims.email.trim().toLowerCase();
}

/** The account behind a consent: its address, refresh token, granted scopes. */
export async function exchangeConnectCode(
  code: string,
  verifier: string,
): Promise<{ email: string; refreshToken: string; scopes: string[] }> {
  const config = client();
  if (!config) throw new IntegrationError("google_connect", "not_set");
  const body = await postGoogleToken(
    "google_connect",
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.id,
      client_secret: config.secret,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  );
  if (!body.refresh_token)
    throw new IntegrationError("google_connect", "no_refresh_token");
  return {
    email: emailOf(body.id_token, config.id),
    refreshToken: body.refresh_token,
    scopes: body.scope?.split(" ") ?? [],
  };
}

// An access token lasts about an hour: kept by the server instance, per
// connected account.
const tokens = new Map<string, { token: string; expiresAt: number }>();

/** An access token for a connected account (`refused`: access withdrawn). */
export async function connectAccessToken(
  accountId: string,
  sealedToken: string,
): Promise<string> {
  const kept = tokens.get(accountId);
  if (kept && kept.expiresAt > Date.now() + 60_000) return kept.token;
  const config = client();
  const refreshToken = unsealGoogleToken(sealedToken);
  if (!config || !refreshToken)
    throw new IntegrationError("google_connect", "not_set");
  const body = await postGoogleToken(
    "google_connect",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.id,
      client_secret: config.secret,
    }),
  );
  if (!body.access_token)
    throw new IntegrationError("google_connect", "unreachable");
  tokens.set(accountId, {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  });
  return body.access_token;
}

/** Withdraws PDS OS's access at Google. Best effort: never throws. */
export async function revokeConnectToken(
  token: string | null,
  accountId?: string,
): Promise<void> {
  if (accountId) tokens.delete(accountId);
  if (!token) return;
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    console.error("google-connect: revoke unreachable");
  }
}
