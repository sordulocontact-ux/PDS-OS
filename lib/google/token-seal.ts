import "server-only";

import { getServerEnv } from "@/lib/env";
import { seal, sealKey, unseal } from "@/lib/utils/seal";

// The refresh token of a Google account a member connected, sealed before it
// reaches the database (key GOOGLE_TOKEN_KEY, server-only): a row read by
// anyone, even its owner, holds nothing usable.

const key = () => sealKey(getServerEnv().GOOGLE_TOKEN_KEY);

/** Whether tokens can be sealed: without the key, nothing is connected. */
export const tokenSealReady = () => key() !== null;

export const sealGoogleToken = (token: string) => seal(key(), token);

export const unsealGoogleToken = (sealed: string | null) =>
  unseal(key(), sealed);
