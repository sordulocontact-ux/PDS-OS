import "server-only";

import { aiQuotaMessage } from "@/lib/ai/quota";

/**
 * A failed call to the model, for callers that answer with a code: a reached
 * daily quota (lib/ai/quota.ts) carries the sentence to show, every other
 * failure stays "provider".
 */
export type ProviderFailure =
  | { ok: false; error: "provider" }
  | { ok: false; error: "quota"; message: string };

export function providerFailure(error: unknown): ProviderFailure {
  const message = aiQuotaMessage(error);
  return message
    ? { ok: false, error: "quota", message }
    : { ok: false, error: "provider" };
}
