import "server-only";

import { getAccess } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { isLaboEnabled } from "@/lib/labo/guard";
import { createClient } from "@/lib/supabase/server";

/**
 * Daily quota of LLM requests (docs/ARCHITECTURE.md § 5 bis). Every call to
 * the model takes one request from the signed-in member before it leaves:
 * consume_ai_request() checks the limit and records the request in one step,
 * with the member's session (RLS). The count is the database's, never the
 * model's.
 */

export type AiUsage = {
  used: number;
  limit: number;
  resetsAt: string;
};

/** The member has used today's requests: the model was not called. */
export class AiQuotaExceededError extends Error {
  readonly code = "ai_quota_exceeded";

  constructor(readonly usage: AiUsage) {
    super("ai_quota_exceeded");
    this.name = "AiQuotaExceededError";
  }
}

/** True when `error`, or an error it wraps, is a reached quota. */
export function isAiQuotaExceeded(
  error: unknown,
  depth = 0,
): error is AiQuotaExceededError {
  if (error instanceof AiQuotaExceededError) return true;
  if (depth > 3 || typeof error !== "object" || error === null) return false;
  return isAiQuotaExceeded((error as { cause?: unknown }).cause, depth + 1);
}

/**
 * Takes one request for the signed-in member, or throws
 * AiQuotaExceededError. Without a member session the model is refused,
 * except in the local labo (no authentication, never in production).
 */
export async function takeAiRequest(): Promise<AiUsage | null> {
  const access = await getAccess();
  if (access.state !== "approved" || !access.organizationId) {
    if (isLaboEnabled) return null;
    throw new Error("ai_requires_member");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("consume_ai_request", { p_organization_id: access.organizationId })
    .single();
  if (error || !data) {
    throw new Error("ai_quota_unreadable", { cause: error });
  }

  const usage = {
    used: data.used,
    limit: data.daily_limit,
    resetsAt: data.resets_at,
  };
  if (!data.allowed) throw new AiQuotaExceededError(usage);
  return usage;
}

/**
 * The sentence to show when `error` is a reached quota, else null: callers
 * keep their own message for every other failure.
 */
export function aiQuotaMessage(error: unknown): string | null {
  return isAiQuotaExceeded(error)
    ? fr.aiUsage.exceeded(error.usage.limit)
    : null;
}
