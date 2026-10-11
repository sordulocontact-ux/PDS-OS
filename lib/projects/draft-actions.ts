"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_DELETE } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { draftValues } from "@/lib/projects/drafts";
import { createClient } from "@/lib/supabase/server";

// Saved with the author's session: RLS keeps a draft to its author, and to
// whoever may create projects.

export type SaveDraftResult =
  // `id: null`: the draft is gone (project created, or deleted elsewhere).
  { ok: true; id: string | null } | { ok: false };

/**
 * Saves the new project form as it is. Without `draftId`, opens a draft;
 * with one, updates it, and never reopens a draft that was deleted.
 * `leaving`: the page is being left, so the cached projects list (where
 * the drafts are listed) is refreshed; never while typing, which would
 * re-render the form.
 */
export async function saveProjectDraft(
  draftId: string | null,
  input: Record<string, string>,
  leaving = false,
): Promise<SaveDraftResult> {
  const access = await requireApproved();
  if (!access.organizationId || !can(access, "create_projects"))
    return { ok: false };
  if (draftId !== null && !z.uuid().safeParse(draftId).success)
    return { ok: false };

  const values = draftValues(input);
  const supabase = await createClient();
  const { data, error } = draftId
    ? await supabase
        .from("project_drafts")
        .update({ form_values: values })
        .eq("id", draftId)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("project_drafts")
        .insert({ organization_id: access.organizationId, form_values: values })
        .select("id")
        .single();
  if (error) {
    console.error("saveProjectDraft:", error.message);
    return { ok: false };
  }
  // The projects list shows the drafts.
  if (leaving) revalidatePath(routes.projects);
  return { ok: true, id: data?.id ?? null };
}

export async function deleteProjectDraft(
  draftId: string,
): Promise<{ ok: boolean }> {
  const result = await deleteProjectDrafts([draftId]);
  return { ok: result.ok };
}

export type DeleteDraftsResult =
  { ok: true; deleted: string[] } | { ok: false };

/**
 * Deletes drafts ticked in the projects list, with the author's session:
 * RLS only lets a draft go by its author, so a foreign id is just not in
 * `deleted`.
 */
export async function deleteProjectDrafts(
  draftIds: string[],
): Promise<DeleteDraftsResult> {
  await requireApproved();
  if (!z.array(z.uuid()).min(1).max(MAX_DELETE).safeParse(draftIds).success)
    return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_drafts")
    .delete()
    .in("id", draftIds)
    .select("id");
  if (error) {
    console.error("deleteProjectDrafts:", error.message);
    return { ok: false };
  }
  revalidatePath(routes.projects);
  return { ok: true, deleted: data.map((row) => row.id) };
}
