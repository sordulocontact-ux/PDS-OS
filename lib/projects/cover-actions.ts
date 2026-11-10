"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  isProjectCoverPath,
  PROJECT_COVER_BUCKET,
} from "@/lib/projects/cover-rules";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const projectIdSchema = z.uuid();

/**
 * The browser uploaded the image (storage RLS: can_edit_project_cover); this
 * records it on the project, or comes back to the default visual (`path`
 * null), then removes the image it replaces. set_project_cover decides who
 * may: the direction before the plan is launched, then the owner only.
 */
export async function setProjectCover(input: {
  projectId: string;
  path: string | null;
}): Promise<WriteResult> {
  const t = fr.projectShell.cover;
  const access = await requireApproved();
  const projectId = projectIdSchema.safeParse(input.projectId);
  if (!access.organizationId || !projectId.success)
    return { ok: false, error: fr.auth.errors.forbidden };
  if (
    input.path !== null &&
    !isProjectCoverPath(input.path, access.organizationId, projectId.data)
  )
    return { ok: false, error: t.failed };

  const supabase = await createClient();
  const { data: previous, error } = await supabase.rpc("set_project_cover", {
    p_project_id: projectId.data,
    ...(input.path ? { p_path: input.path } : {}),
  });
  if (error) {
    console.error("setProjectCover:", error.message);
    return {
      ok: false,
      error: error.code === "42501" ? fr.auth.errors.forbidden : t.failed,
    };
  }
  if (previous && previous !== input.path) {
    const removed = await supabase.storage
      .from(PROJECT_COVER_BUCKET)
      .remove([previous]);
    if (removed.error)
      console.error("setProjectCover (cleanup):", removed.error.message);
  }
  // The overview and the list of projects show it.
  revalidatePath(routes.project(projectId.data), "layout");
  revalidatePath(routes.projects);
  return { ok: true };
}
