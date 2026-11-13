import "server-only";

import { createSign } from "node:crypto";

import { z } from "zod";

import type { GoogleService } from "@/lib/google/services";
import { getServerEnv } from "@/lib/env";
import {
  GOOGLE_SCOPE,
  GOOGLE_TOKEN_URL,
  postGoogleToken,
  probeGoogleService,
  type ProbeResult,
} from "@/lib/integrations/google-member-api";
import { IntegrationError } from "@/lib/integrations/http";

/**
 * The work accounts (@pdsrecords.com), read with no click (docs/
 * ARCHITECTURE.md § 4 quater): a service account the Workspace domain
 * delegated, read-only, to Agenda, Gmail and Drive. It can read any address of
 * the domain, so every caller passes the signed-in member's own work address
 * (their login, or the one the direction wrote on their membership, read with
 * their session), never one chosen by a client or by PO. Distinct from po@'s
 * token (google-oauth.ts), which writes the calls' events.
 */

const serviceKey = z.object({
  client_email: z.email(),
  private_key: z.string().includes("PRIVATE KEY"),
});

type WorkspaceSettings = {
  clientEmail: string;
  privateKey: string;
};

/** The key, or null while it and its domain are not both in place. */
function workspaceSettings(): WorkspaceSettings | null {
  const env = getServerEnv();
  const raw = env.GOOGLE_WORKSPACE_KEY?.trim();
  if (!raw || !env.GOOGLE_WORKSPACE_DOMAIN) return null;
  const text = raw.startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("google-workspace: GOOGLE_WORKSPACE_KEY is not a JSON key");
    return null;
  }
  const key = serviceKey.safeParse(parsed);
  if (!key.success) {
    console.error("google-workspace: GOOGLE_WORKSPACE_KEY lacks its fields");
    return null;
  }
  return {
    clientEmail: key.data.client_email,
    privateKey: key.data.private_key,
  };
}

/** Whether the domain's key is in place (nothing is read without it). */
export function workspaceConfigured(): boolean {
  return workspaceSettings() !== null;
}

/** The delegated domain (« pdsrecords.com »), or null. */
export const workspaceDomain = (): string | null =>
  getServerEnv().GOOGLE_WORKSPACE_DOMAIN ?? null;

/** Whether this address belongs to the delegated domain. */
export function inWorkspaceDomain(
  email: string | null | undefined,
): email is string {
  const domain = workspaceDomain();
  return (
    !!email && !!domain && email.trim().toLowerCase().endsWith(`@${domain}`)
  );
}

const base64Url = (value: string | Buffer) =>
  Buffer.from(value).toString("base64url");

// Signed by the service account, acting as `subject` for one scope.
function assertion(config: WorkspaceSettings, subject: string, scope: string) {
  const now = Math.floor(Date.now() / 1000);
  const head = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: config.clientEmail,
      sub: subject,
      scope,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${claims}`);
  return `${head}.${claims}.${base64Url(signer.sign(config.privateKey))}`;
}

// An access token lasts about an hour: kept by the server instance, per
// member and service.
const tokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * An access token to read `service` as the work address `email`. Throws
 * IntegrationError: `not_set` (no key, or an address outside the domain),
 * `refused` (delegation not granted, unknown account), `unreachable`.
 */
export async function workspaceAccessToken(
  email: string,
  service: GoogleService,
): Promise<string> {
  const config = workspaceSettings();
  if (!config || !inWorkspaceDomain(email))
    throw new IntegrationError("google_workspace", "not_set");
  const subject = email.trim().toLowerCase();
  const cacheKey = `${subject}|${service}`;
  const kept = tokens.get(cacheKey);
  if (kept && kept.expiresAt > Date.now() + 60_000) return kept.token;
  const body = await postGoogleToken(
    "google_workspace",
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion(config, subject, GOOGLE_SCOPE[service]),
    }),
  );
  if (!body.access_token)
    throw new IntegrationError("google_workspace", "unreachable");
  tokens.set(cacheKey, {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  });
  return body.access_token;
}

/** Whether `service` answers for this work address. Never throws. */
export const probeWorkspaceService = (
  email: string,
  service: GoogleService,
): Promise<ProbeResult> =>
  probeGoogleService(service, () => workspaceAccessToken(email, service));
