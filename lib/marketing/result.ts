import "server-only";

import { revalidatePath } from "next/cache";

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ActionOutcome } from "@/lib/utils/action-outcome";

const e = fr.marketing.errors;

export const okOutcome: ActionOutcome = { ok: true };
export const failOutcome = (error: string): ActionOutcome => ({
  ok: false,
  error,
});

/** Maps a database refusal of the Marketing follow-up to its message. */
export function marketingFailure(error: {
  code?: string;
  message?: string;
}): ActionOutcome {
  const message = error.message ?? "";
  if (message.includes("marketing_closed")) return failOutcome(e.closed);
  if (message.includes("marketing_evidence_verified_check"))
    return failOutcome(e.linkRequired);
  if (message.includes("marketing_evidence_statistic_check"))
    return failOutcome(e.valueRequired);
  if (message.includes("not_found")) return failOutcome(e.notFound);
  if (error.code === "42501") return failOutcome(e.forbidden);
  if (error.code === "23514" || error.code === "22P02")
    return failOutcome(e.invalid);
  console.error("[marketing]", error.code, message);
  return failOutcome(e.generic);
}

/** Ends a write: the pages reading the Marketing follow-up are refreshed. */
export function marketingDone(
  projectId: string,
  error: { code?: string; message?: string } | null,
): ActionOutcome {
  if (error) return marketingFailure(error);
  revalidatePath(routes.projectActivations(projectId), "layout");
  revalidatePath(routes.projectReview(projectId), "layout");
  return okOutcome;
}
