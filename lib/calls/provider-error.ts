import { isAiQuotaExceeded } from "@/lib/ai/quota";
import type { CallErrorCode } from "@/lib/calls/constants";

/**
 * Maps a provider failure to an error code the UI can explain. AI SDK errors
 * carry `statusCode`, sometimes nested in `cause`, `lastError` or `errors`.
 */

function statusCodeOf(error: unknown, depth = 0): number | null {
  if (depth > 5 || typeof error !== "object" || error === null) return null;
  const record = error as Record<string, unknown>;
  if (typeof record.statusCode === "number") return record.statusCode;
  for (const key of ["lastError", "cause"]) {
    const found = statusCodeOf(record[key], depth + 1);
    if (found !== null) return found;
  }
  if (Array.isArray(record.errors)) {
    for (const nested of record.errors) {
      const found = statusCodeOf(nested, depth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}

export function classifyProviderError(error: unknown): CallErrorCode {
  // The member's daily limit of requests to PO: the model was not called.
  if (isAiQuotaExceeded(error)) return "ai_quota";
  const status = statusCodeOf(error);
  if (status === 413) return "audio_too_large";
  if (status === 429) return "provider_quota";
  return "provider_error";
}
