"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  DESIGN_FILE_BUCKET,
  MAX_DESIGN_FILE_BYTES,
  isDesignFilePath,
  isHttpsUrl,
} from "@/lib/design/rules";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// Conception writes, with the user's session: RLS and can_deposit_design_version
// decide who deposits, review_design_version who reviews (rule 3).

const target = {
  projectId: z.uuid(),
  // Null: a board of the creative direction.
  deliverableId: z.uuid().nullable(),
  note: z.string().trim().max(1000),
};

const fileSchema = z.object({
  ...target,
  path: z.string().max(200),
  fileName: z.string().trim().min(1).max(255),
  mime: z.string().trim().min(1).max(255),
  bytes: z.number().int().positive().max(MAX_DESIGN_FILE_BYTES),
});

const linkSchema = z.object({
  ...target,
  url: z.string().trim().max(2000).refine(isHttpsUrl),
});

async function finish(
  projectId: string,
  error: { code?: string; message?: string } | null,
  refused: ActionResult,
): Promise<ActionResult> {
  if (error?.code === "42501") return refused;
  if (error) return fromDatabaseError(error);
  // A deposit or a review notifies someone (database triggers).
  await schedulePendingPushes();
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

// The browser uploaded the object (storage RLS); this records it.
export async function recordDesignFile(
  input: z.input<typeof fileSchema>,
): Promise<ActionResult> {
  const access = await requireApproved();
  const parsed = fileSchema.safeParse(input);
  if (!access.organizationId || !parsed.success) return fail("invalid_input");
  const v = parsed.data;
  if (!isDesignFilePath(v.path, access.organizationId, v.projectId))
    return fail("invalid_input");

  const supabase = await createClient();
  const { error } = await supabase.from("design_versions").insert({
    organization_id: access.organizationId,
    project_id: v.projectId,
    deliverable_id: v.deliverableId,
    kind: "file",
    path: v.path,
    file_name: v.fileName,
    mime: v.mime,
    bytes: v.bytes,
    note: v.note || null,
  });
  return finish(v.projectId, error, fail("cannot_deposit"));
}

export async function addDesignLink(
  input: z.input<typeof linkSchema>,
): Promise<ActionResult> {
  const access = await requireApproved();
  const parsed = linkSchema.safeParse(input);
  if (!access.organizationId || !parsed.success) return fail("invalid_input");
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("design_versions").insert({
    organization_id: access.organizationId,
    project_id: v.projectId,
    deliverable_id: v.deliverableId,
    kind: "link",
    url: v.url,
    note: v.note || null,
  });
  return finish(v.projectId, error, fail("cannot_deposit"));
}

/** Its author withdraws a version not reviewed yet (row, then object). */
export async function withdrawDesignVersion(
  projectId: string,
  versionId: string,
): Promise<ActionResult> {
  await requireApproved();
  if (!z.uuid().safeParse(versionId).success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_versions")
    .delete()
    .eq("id", versionId)
    .eq("project_id", projectId)
    .select("path")
    .maybeSingle();
  if (error) return fromDatabaseError(error);
  // RLS hid it: reviewed meanwhile, or not the author's.
  if (!data) return fail("invalid_transition");
  if (data.path) {
    const removed = await supabase.storage
      .from(DESIGN_FILE_BUCKET)
      .remove([data.path]);
    if (removed.error)
      console.error("withdrawDesignVersion (object):", removed.error.message);
  }
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

/**
 * A creative proposal's review (MKT-C2-10): the concept approved, changes
 * asked (a reason, a zone if precise — the author's retouche task follows,
 * once), or the proposal set aside (a reason). Never by its own author.
 */
export async function reviewDesignVersion(
  projectId: string,
  versionId: string,
  decision: "approved" | "changes_requested" | "discarded",
  comment: string,
  scope = "",
): Promise<ActionResult> {
  await requireApproved();
  const parsed = z
    .object({
      versionId: z.uuid(),
      decision: z.enum(["approved", "changes_requested", "discarded"]),
      comment: z.string().max(1000),
      scope: z.string().max(500),
    })
    .safeParse({ versionId, decision, comment, scope });
  if (!parsed.success) return fail("invalid_input");
  if (decision !== "approved" && comment.trim() === "")
    return fail("reason_required");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_design_version", {
    p_version_id: versionId,
    p_decision: decision,
    p_comment: comment,
    p_scope: scope,
  });
  // stage_locked is raised with 42501 too: the message decides first.
  if (error?.message?.includes("stage_locked")) return fail("stage_locked");
  return finish(projectId, error, fail("forbidden"));
}
