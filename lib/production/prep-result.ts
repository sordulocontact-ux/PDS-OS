import "server-only";

import { revalidatePath } from "next/cache";

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { WriteResult } from "@/lib/utils/write-result";

// The outcome of a preparation write (sheet, brief, needs, call): an error
// already in French, as the rest of Production (lib/production/actions.ts).
export type PrepResult = WriteResult;

const e = fr.productionPrep.errors;

/** Maps a database refusal of the preparation to its message. */
export function prepFailure(error: {
  code?: string;
  message?: string;
}): PrepResult {
  const message = error.message ?? "";
  if (message.includes("design_not_approved"))
    return { ok: false, error: e.notApproved };
  if (message.includes("stage_locked")) return { ok: false, error: e.locked };
  if (
    message.includes("sheet_not_found") ||
    message.includes("deliverable_not_found")
  )
    return { ok: false, error: e.notFound };
  if (error.code === "42501" || message.includes("not_allowed"))
    return { ok: false, error: e.forbidden };
  if (
    error.code === "23514" ||
    error.code === "22023" ||
    error.code === "23505"
  )
    return { ok: false, error: e.invalid };
  console.error("production prep:", error.code, message);
  return { ok: false, error: e.generic };
}

/** Ends a preparation write: the sheet, the Production list and the
 * Marketing's status follow. */
export function prepDone(projectId: string): PrepResult {
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}
