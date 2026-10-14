"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  COMMENT_CATEGORIES,
  COMMENT_STATUSES,
  VERSION_DECISIONS,
} from "@/lib/production/post/rules";
import {
  forbiddenPost,
  invalidPost,
  notFoundPost,
  postFailure,
  type PostResult,
} from "@/lib/production/post/result";
import { parseTimecode } from "@/lib/production/post/timecode";
import { prepDone } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

// Feedback and decisions (parcours 17 and 18), by the owner or a creative
// director of the project while Production runs (production_can_review, in
// RLS and in the functions). The statuses' rules live in the database.

const commentSchema = z.object({
  projectId: z.uuid(),
  versionId: z.uuid(),
  // mm:ss or hh:mm:ss; empty = a general comment.
  timecode: z.string().max(12),
  category: z.enum(COMMENT_CATEGORIES),
  body: z.string().trim().min(1).max(2000),
  // An attachment already uploaded (the owner only: storage RLS).
  fileId: z.uuid().nullable(),
});

export async function addPostComment(
  input: z.input<typeof commentSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const c = parsed.data;
  const timecode = parseTimecode(c.timecode);
  if (!timecode.ok) return invalidPost;
  const supabase = await createClient();
  const { data: version } = await supabase
    .from("production_versions")
    .select("organization_id, sheet_id")
    .eq("id", c.versionId)
    .eq("project_id", c.projectId)
    .maybeSingle();
  if (!version) return notFoundPost;
  const { error } = await supabase.from("production_version_comments").insert({
    organization_id: version.organization_id,
    project_id: c.projectId,
    sheet_id: version.sheet_id,
    version_id: c.versionId,
    timecode_ms: timecode.ms,
    category: c.category,
    body: c.body,
    file_id: c.fileId,
  });
  return error ? postFailure(error) : prepDone(c.projectId);
}

const statusSchema = z.object({
  projectId: z.uuid(),
  commentId: z.uuid(),
  status: z.enum(COMMENT_STATUSES),
});

/** Moves a feedback; « corrigé déclaré » goes through « à vérifier » (the
 * database refuses otherwise). */
export async function setPostCommentStatus(
  input: z.input<typeof statusSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_version_comments")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.commentId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return postFailure(error);
  return data.length === 0 ? forbiddenPost : prepDone(parsed.data.projectId);
}

const decisionSchema = z
  .object({
    projectId: z.uuid(),
    versionId: z.uuid(),
    decision: z.enum(VERSION_DECISIONS).exclude(["changes"]),
    note: z.string().trim().max(2000),
  })
  .refine((d) => d.decision === "approve" || d.note !== "");

/** « Valider » or « Refuser » a version under review (PROD-033); a refusal
 * says why. Corrections go through requestCorrections (correction-actions). */
export async function decidePostVersion(
  input: z.input<typeof decisionSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_production_version", {
    p_version_id: parsed.data.versionId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note,
  });
  return error ? postFailure(error) : prepDone(parsed.data.projectId);
}
