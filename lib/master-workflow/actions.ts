"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const sourceSchema = z.object({
  projectId: z.uuid(),
  masterId: z.uuid(),
  fileId: z.uuid(),
});

export type SourceResult = { ok: true } | { ok: false; error: string };

/**
 * Confirms the source of a title's mix (a new confirmation, the earlier ones
 * stay as history). Written with the user's session: the database lets only
 * the project's owner write, checks the title is in the project and the file
 * an audio version of it (not its master final). The codes only pick the
 * message.
 */
export async function confirmMasterSource(input: {
  projectId: string;
  masterId: string;
  fileId: string;
}): Promise<SourceResult> {
  const t = fr.masterWorkflow.inventory.source.errors;
  const parsed = sourceSchema.safeParse(input);
  const access = await requireApproved();
  if (!parsed.success || !access.organizationId)
    return { ok: false, error: t.failed };
  const { projectId, masterId, fileId } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("master_flow_sources").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    master_id: masterId,
    file_id: fileId,
  });
  if (error) {
    console.error("confirmMasterSource:", error.code, error.message);
    if (error.code === "42501") return { ok: false, error: t.forbidden };
    if (
      error.code === "23503" ||
      error.message.includes("source_not_an_audio_version_of_title")
    )
      return { ok: false, error: t.notASource };
    return { ok: false, error: t.failed };
  }
  revalidatePath(routes.projectMaster(projectId));
  return { ok: true };
}
