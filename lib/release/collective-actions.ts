"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { RELEASE_MODES } from "@/lib/release/collective-rules";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// A collective's releases (lot 13): the database decides who (the owner,
// create_projects before launch) and what each mode creates or archives.

const t = fr.collectiveReleases.errors;

const refresh = (projectId: string) =>
  revalidatePath(routes.project(projectId), "layout");

/** « Mode de sortie ». */
export async function setCollectiveReleaseMode(
  projectId: string,
  mode: string,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({ projectId: z.uuid(), mode: z.enum(RELEASE_MODES) })
    .safeParse({ projectId, mode });
  if (!parsed.success) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_collective_release_mode", {
    p_project_id: parsed.data.projectId,
    p_mode: parsed.data.mode,
  });
  if (error) {
    if (error.code === "42501")
      return { ok: false, error: fr.auth.errors.forbidden };
    for (const code of [
      "mode_unchanged",
      "compilation_submitted",
      "single_released",
    ] as const)
      if (error.message.includes(code)) return { ok: false, error: t[code] };
    console.error("setCollectiveReleaseMode:", error.message);
    return { ok: false, error: t.failed };
  }
  refresh(parsed.data.projectId);
  return { ok: true };
}

/** « Modifier la date » of a title's release (its own date, lot 13; the
 * compilation's is the project's due date). The owner, RLS. */
export async function setTitleReleaseDate(
  projectId: string,
  releaseId: string,
  date: string,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      releaseId: z.uuid(),
      date: z.union([z.iso.date(), z.literal("")]),
    })
    .safeParse({ projectId, releaseId, date });
  if (!parsed.success) return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("releases")
    .update({ planned_release_date: parsed.data.date || null })
    .eq("id", parsed.data.releaseId)
    .eq("project_id", parsed.data.projectId)
    .not("project_title_id", "is", null)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("setTitleReleaseDate:", error.message);
    return { ok: false, error: error ? t.failed : fr.auth.errors.forbidden };
  }
  refresh(parsed.data.projectId);
  return { ok: true };
}
