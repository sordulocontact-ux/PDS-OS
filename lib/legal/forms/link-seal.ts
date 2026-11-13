import "server-only";

import { getServerEnv } from "@/lib/env";
import { seal, sealKey, unseal } from "@/lib/utils/seal";

// A private link kept visible in its démarche (proto « Projet complet »,
// rule 19) without the database ever holding a usable token: the server
// seals the token (lib/utils/seal.ts, key LEGAL_LINK_KEY, server-only).
// Without the key, nothing is sealed: the démarche shows the link's state,
// and « Nouveau lien » gives a new one to copy.

const key = () => sealKey(getServerEnv().LEGAL_LINK_KEY);

/** The token sealed for storage, or null when no key is set. */
export function sealLinkToken(token: string): string | null {
  return seal(key(), token);
}

/** The token back, or null (no key, another key, altered value). */
export function unsealLinkToken(sealed: string | null): string | null {
  return unseal(key(), sealed);
}
