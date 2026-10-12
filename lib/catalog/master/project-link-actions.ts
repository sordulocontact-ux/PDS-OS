"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const input = z.object({ masterId: catalogIdSchema, projectId: z.uuid() });

// « Rattacher à un projet existant » (retours Catalogue 16, 64): one link,
// never a copy of the title; the database decides who and when.
export async function linkMasterToProject(
  value: z.input<typeof input>,
): Promise<WriteResult> {
  await requireApproved();
  const t = fr.masterPage.projects.link.errors;
  const parsed = input.safeParse(value);
  if (!parsed.success) return { ok: false, error: t.failed };
  const { masterId, projectId } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("link_master_to_project", {
    p_project_id: projectId,
    p_master_id: masterId,
  });
  if (error) {
    if (error.message.includes("single_requires_one_master"))
      return { ok: false, error: t.single };
    if (error.code === "42501" || error.message.includes("row-level security"))
      return { ok: false, error: t.launched };
    console.error("linkMasterToProject:", error.message);
    return { ok: false, error: t.failed };
  }
  revalidatePath(routes.master(masterId), "layout");
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}
