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
import { DIMENSIONS } from "@/lib/framing/dimensions";
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

/** « Envoyer en validation »: the latest version, if it is still the Cadrage. */
export async function sendBrief(
  projectId: string,
  briefId: string,
  note: string,
): Promise<ActionResult> {
  const p = z
    .object({
      projectId: z.uuid(),
      briefId: z.uuid(),
      note: z.string().max(500),
    })
    .safeParse({ projectId, briefId, note });
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
  });
  return done(projectId, error);
}

/**
 * The validator's decision: « Valider le Brief », or « Demander une
 * modification » with a precise comment and the dimensions to reopen.
 */
export async function decideBrief(
  projectId: string,
  validationId: string,
  approve: boolean,
  comment: string,
  dimensions: string[],
): Promise<ActionResult> {
  const p = z
    .object({
      validationId: z.uuid(),
      comment: z.string().trim().max(2000),
      dimensions: z.array(z.enum(DIMENSIONS)).max(DIMENSIONS.length),
    })
    .safeParse({ validationId, comment, dimensions });
  if (!p.success) return fail("invalid_input");
  if (!approve && !p.data.comment) return fail("reason_required");
  if (!approve && p.data.dimensions.length === 0)
    return fail("dimensions_required");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_framing_brief", {
    p_validation_id: p.data.validationId,
    p_approve: approve,
    p_comment: p.data.comment,
    p_dimensions: approve ? undefined : p.data.dimensions,
  });
  return done(projectId, error);
}
