"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { auth } from "@/lib/i18n/fr/auth";
import { distribution } from "@/lib/i18n/fr/distribution";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = distribution.requirements;

const formats = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v ? v : null));

/** « Enregistrer » what the distributor asks of the audio files: the
 * administration (RLS), as the billing identity. Empty clears it. */
export async function saveDistributionFormats(
  input: string,
): Promise<WriteResult> {
  const v = formats.safeParse(input);
  if (!v.success) return { ok: false, error: t.failed };
  const access = await requireApproved();
  if (!access.organizationId) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const values = { audio_formats: v.data };
  // Update the row when it exists, else create it (no upsert: the
  // organization never changes, it is not updatable).
  const updated = await supabase
    .from("organization_distribution")
    .update(values)
    .eq("organization_id", access.organizationId)
    .select("organization_id");
  const { error } =
    updated.error || (updated.data?.length ?? 0) > 0
      ? updated
      : await supabase
          .from("organization_distribution")
          .insert({ organization_id: access.organizationId, ...values });
  if (error) {
    console.error("saveDistributionFormats:", error.message);
    return {
      ok: false,
      error: error.code === "42501" ? auth.errors.forbidden : t.failed,
    };
  }
  revalidatePath("/app/settings");
  revalidatePath("/app/projects", "layout");
  return { ok: true, done: t.saved };
}
