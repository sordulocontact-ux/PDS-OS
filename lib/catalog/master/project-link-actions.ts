"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const input = z.object({
  masterId: catalogIdSchema,
  projectId: z.uuid(),
  // A collective (lot 7): one of its titles not in the Catalogue yet, or
  // none (a new title of the project).
  projectTitleId: z.uuid().nullable().optional(),
  collective: z.boolean().optional(),
});

// « Rattacher à un projet existant » (retours Catalogue 16, 64): one link,
// never a copy of the title; the database decides who and when. A
// collective takes it as one of its titles (add_project_title, or
// attach_master_to_project_title for a title that waited for it).
export async function linkMasterToProject(
  value: z.input<typeof input>,
): Promise<WriteResult> {
  await requireApproved();
  const t = fr.masterPage.projects.link.errors;
  const parsed = input.safeParse(value);
  if (!parsed.success) return { ok: false, error: t.failed };
  const { masterId, projectId, projectTitleId, collective } = parsed.data;
  const supabase = await createClient();
  const { error } = !collective
    ? await supabase.rpc("link_master_to_project", {
        p_project_id: projectId,
        p_master_id: masterId,
      })
    : projectTitleId
      ? await supabase.rpc("attach_master_to_project_title", {
          p_title_id: projectTitleId,
          p_master_id: masterId,
        })
      : await supabase.rpc("add_project_title", {
          p_project_id: projectId,
          p_master_id: masterId,
        });
  if (error) {
    if (error.message.includes("single_requires_one_master"))
      return { ok: false, error: t.single };
    if (error.message.includes("title_already_in_project"))
      return { ok: false, error: t.alreadyIn };
    if (error.message.includes("title_has_master"))
      return { ok: false, error: t.titleTaken };
    if (error.message.includes("title_abandoned"))
      return { ok: false, error: t.titleAbandoned };
    if (error.code === "42501" || error.message.includes("row-level security"))
      return { ok: false, error: collective ? t.notOwner : t.launched };
    console.error("linkMasterToProject:", error.message);
    return { ok: false, error: t.failed };
  }
  revalidatePath(routes.master(masterId), "layout");
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}
