import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { routes } from "@/lib/auth/redirects";
import type { ConnectOutcome } from "@/lib/google/services";
import { sealGoogleToken, unsealGoogleToken } from "@/lib/google/token-seal";

/**
 * The round trip of « Connecter un compte Google »: what the browser keeps
 * between the start (/api/google/connect) and Google's return
 * (/api/google/callback). A sealed, HTTP-only cookie holding the state, the
 * PKCE verifier and who started it, valid ten minutes: a return that does not
 * match it (another tab, another member, a forged link) connects nothing.
 */

export const CONNECT_COOKIE = "pds_google_connect";
export const CONNECT_COOKIE_PATH = "/api/google";
const TTL_SECONDS = 600;

type Flow = { state: string; verifier: string; personId: string; exp: number };

/** A new round trip: the cookie to set, the state and PKCE challenge. */
export function startConnectFlow(personId: string) {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const flow: Flow = {
    state,
    verifier,
    personId,
    exp: Date.now() + TTL_SECONDS * 1000,
  };
  return {
    state,
    challenge,
    cookie: sealGoogleToken(JSON.stringify(flow)),
    maxAge: TTL_SECONDS,
  };
}

/** The verifier when Google's return matches the cookie, else null. */
export function finishConnectFlow(
  cookie: string | undefined,
  state: string | null,
  personId: string,
): string | null {
  const text = unsealGoogleToken(cookie ?? null);
  if (!text || !state) return null;
  try {
    const flow = JSON.parse(text) as Flow;
    return flow.state === state &&
      flow.personId === personId &&
      flow.exp > Date.now()
      ? flow.verifier
      : null;
  } catch {
    return null;
  }
}

/** The settings, saying how the round trip ended (`?google=`). */
export const settingsAfterConnect = (outcome: ConnectOutcome) =>
  `${routes.settingsConnections}?google=${outcome}`;
