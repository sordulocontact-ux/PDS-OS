"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { normalizeUpc, upcError } from "@/lib/distribution/upc";
import { fr } from "@/lib/i18n/fr";
import { loadRelease, PROJECT_RELEASE } from "@/lib/release/queries";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.distributionJourney.upc;

/**
 * « Modifier » the UPC of the release, in the Paramètres de distribution:
 * checked by the code (12 or 13 digits, its check digit), written by the
 * project's owner (RLS releases_update_owner), read by the delivery file.
 * Empty clears it: « Attribué par The Orchard au dépôt ».
 */
export async function setReleaseUpc(
  projectId: string,
  value: string,
  // One release (lot 13: a collective's title's release or compilation);
  // absent: the project's release, as the Paramètres de distribution ask.
  releaseId?: string,
): Promise<WriteResult> {
  const input = z
    .object({
      projectId: z.uuid(),
      value: z.string().max(40),
      releaseId: z.uuid().optional(),
    })
    .safeParse({ projectId, value, releaseId });
  if (!input.success) return { ok: false, error: t.errors.failed };
  const upc = normalizeUpc(input.data.value);
  const refused = upc ? upcError(upc) : null;
  if (refused) return { ok: false, error: t.errors[refused] };
  await requireApproved();
  const supabase = await createClient();
  // Each release has its own UPC (§ 3 bis point 5): never every release of
  // the project at once.
  const target =
    input.data.releaseId ??
    (await loadRelease(supabase, input.data.projectId, PROJECT_RELEASE))?.id;
  if (!target) return { ok: false, error: t.errors.failed };
  const { data, error } = await supabase
    .from("releases")
    .update({ upc: upc || null })
    .eq("id", target)
    .eq("project_id", input.data.projectId)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("setReleaseUpc:", error.message);
    return { ok: false, error: t.errors.failed };
  }
  revalidatePath(routes.project(input.data.projectId), "layout");
  return { ok: true, done: upc ? t.saved : t.cleared };
}
