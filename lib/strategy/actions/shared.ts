import "server-only";

import { revalidatePath } from "next/cache";

import { routes } from "@/lib/auth/redirects";
import { fromDatabaseError, ok, type ActionResult } from "@/lib/framing/result";

/**
 * Ends a strategy write. The owner only sees write controls while the stage
 * is in progress, so an RLS refusal here means it was submitted or validated
 * meanwhile (a stale page), not a missing right.
 */
export async function done(
  projectId: string,
  error: { code?: string; message?: string } | null,
): Promise<ActionResult> {
  if (error?.code === "42501") return { ok: false, error: "stage_locked" };
  if (error) return fromDatabaseError(error);
  // Every step of the Stratégie, and the project's « Maintenant ».
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}
