"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { assessFraming } from "@/lib/framing/assess";
import {
  buildBriefSnapshot,
  snapshotMatches,
  snapshotOf,
} from "@/lib/framing/brief-snapshot";
import {
  DIMENSIONS,
  QUESTION_KEYS,
  QUESTIONS,
  type QuestionKey,
} from "@/lib/framing/dimensions";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// The Brief as versions (ticket § 7 and § 8): generated from what is
// confirmed, sent through the validation circuit, validated or sent back
// with the dimensions to reopen. States move in SQL only (rule 6).

async function done(
  projectId: string,
  error: { code?: string; message?: string } | null,
): Promise<ActionResult> {
  if (error) return fromDatabaseError(error);
  // The validation notifies someone (database triggers).
  await schedulePendingPushes();
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

/**
 * « Générer le Brief » / « Mettre à jour le Brief »: a new version from the
 * Cadrage as it stands, once every required question is known and nothing
 * is left to confirm. The snapshot is written by the server.
 */
export async function generateBrief(projectId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(projectId).success) return fail("invalid_input");
  const access = await requireApproved();
  const knowledge = await loadFramingKnowledge(projectId, access);
  if (!knowledge) return fail("not_found");
  if (!assessFraming(knowledge).ready) return fail("brief_incomplete");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_framing_brief", {
    p_project_id: projectId,
    p_content: buildBriefSnapshot(knowledge) as never,
  });
  if (error?.message?.includes("stage_locked")) return fail("stage_locked");
  return done(projectId, error);
}

/**
 * « Envoyer en validation »: the latest version, if it is still the Cadrage.
 * A version that says exactly what the last one sent said goes only with a
 * written reason (PROJ-BUG-05), checked again by the database.
 */
export async function sendBrief(
  projectId: string,
  briefId: string,
  note: string,
  unchangedReason = "",
): Promise<ActionResult> {
  const p = z
    .object({
      projectId: z.uuid(),
      briefId: z.uuid(),
      note: z.string().max(500),
      unchangedReason: z.string().trim().max(1000),
    })
    .safeParse({ projectId, briefId, note, unchangedReason });
  if (!p.success) return fail("invalid_input");
  const access = await requireApproved();
  const knowledge = await loadFramingKnowledge(projectId, access);
  const version = knowledge?.briefs.find((b) => b.id === briefId);
  const stored = version ? snapshotOf(version.content) : null;
  if (!knowledge || !stored) return fail("not_found");
  if (!snapshotMatches(stored, buildBriefSnapshot(knowledge)))
    return fail("brief_outdated");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_framing_brief", {
    p_brief_id: briefId,
    p_note: note,
    p_unchanged_reason: p.data.unchangedReason || undefined,
  });
  return done(projectId, error);
}

const request = z.object({
  dimension: z.enum(DIMENSIONS),
  questionKey: z
    .enum(QUESTION_KEYS as [QuestionKey, ...QuestionKey[]])
    .nullable(),
  body: z.string().trim().min(1).max(2000),
  mandatory: z.boolean(),
});
export type BriefRequestInput = z.input<typeof request>;

/**
 * The validator's decision: « Valider le Brief » (refused while a mandatory
 * request is open), or « Demander une modification » as a list of requests,
 * each anchored to a dimension or a question (PROJ-UX-06); the dimensions to
 * reopen follow from them.
 */
export async function decideBrief(
  projectId: string,
  validationId: string,
  approve: boolean,
  comment: string,
  requests: BriefRequestInput[],
): Promise<ActionResult> {
  const p = z
    .object({
      validationId: z.uuid(),
      comment: z.string().trim().max(2000),
      requests: z.array(request).max(30),
    })
    .safeParse({ validationId, comment, requests });
  if (!p.success) return fail("invalid_input");
  // A question always belongs to the dimension it is asked under.
  if (
    p.data.requests.some(
      (r) =>
        r.questionKey && QUESTIONS[r.questionKey].dimension !== r.dimension,
    )
  )
    return fail("invalid_input");
  if (!approve && p.data.requests.length === 0)
    return fail("requests_required");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_framing_brief", {
    p_validation_id: p.data.validationId,
    p_approve: approve,
    p_comment: p.data.comment,
    p_requests: approve ? undefined : (p.data.requests as never),
  });
  return done(projectId, error);
}
