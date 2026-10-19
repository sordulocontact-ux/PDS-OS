import "server-only";

import { fromDatabaseError, type ActionResult } from "@/lib/framing/result";
import { fr } from "@/lib/i18n/fr";
import type { WriteResult } from "@/lib/utils/write-result";

/** An ActionResult as the common write result, its error said in French. */
export function toWrite(result: ActionResult): WriteResult {
  if (result.ok) return { ok: true };
  const errors: Record<string, string> = fr.framing.errors;
  return { ok: false, error: errors[result.error] ?? errors.generic };
}

/** A database error as the common write result (null: done). */
export function dbWrite(
  error: { code?: string; message?: string } | null,
): WriteResult {
  if (!error) return { ok: true };
  const errors: Record<string, string> = fr.framing.errors;
  if (error.message && errors[error.message])
    return { ok: false, error: errors[error.message] };
  if (error.message?.includes("release_date_required"))
    return { ok: false, error: fr.strategyDimensions.errors.releaseDate };
  if (error.code === "42501")
    return { ok: false, error: fr.framing.errors.stage_locked };
  return toWrite(fromDatabaseError(error));
}
