"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { normalizeUpc, upcError } from "@/lib/distribution/upc";
import { fr } from "@/lib/i18n/fr";
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
): Promise<WriteResult> {
  const input = z
    .object({ projectId: z.uuid(), value: z.string().max(40) })
    .safeParse({ projectId, value });
  if (!input.success) return { ok: false, error: t.errors.failed };
  const upc = normalizeUpc(input.data.value);
  const refused = upc ? upcError(upc) : null;
  if (refused) return { ok: false, error: t.errors[refused] };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("releases")
    .update({ upc: upc || null })
    .eq("project_id", input.data.projectId)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("setReleaseUpc:", error.message);
    return { ok: false, error: t.errors.failed };
  }
  revalidatePath(routes.project(input.data.projectId), "layout");
  return { ok: true, done: upc ? t.saved : t.cleared };
}
