"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  catalogOrganization,
  refreshMaster,
} from "@/lib/catalog/master/action-helpers";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { AUDIO_STATES } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// Decisions and comments on the audio versions of a title (retours
// Catalogue 18, 19, 25, 26). Every write runs with the user's session: the
// SQL functions check manage_catalog on a live title, decide once, and
// refuse to reclassify an examined or used version; RLS lets every member
// comment. Nothing here validates by itself.

const t = fr.masterPage.audio.versions;

const ids = z.object({ masterId: catalogIdSchema, fileId: z.uuid() });

const reviewSchema = ids.extend({
  decision: z.enum(["approved", "changes_requested"]),
  note: z.string().trim().max(2000),
});

export async function reviewAudioVersion(
  input: z.input<typeof reviewSchema>,
): Promise<WriteResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.failed };
  const { masterId, fileId, decision, note } = parsed.data;
  if (decision === "changes_requested" && !note)
    return { ok: false, error: t.errors.noteRequired };
  if (!(await catalogOrganization()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_master_audio", {
    p_file_id: fileId,
    p_decision: decision,
    p_note: note || undefined,
  });
  if (error) {
    if (error.message.includes("already_reviewed"))
      return { ok: false, error: t.errors.alreadyReviewed };
    console.error("reviewAudioVersion:", error.message);
    return { ok: false, error: t.errors.failed };
  }
  refreshMaster(masterId);
  return { ok: true };
}

const reclassifySchema = ids.extend({ state: z.enum(AUDIO_STATES) });

export async function reclassifyAudioVersion(
  input: z.input<typeof reclassifySchema>,
): Promise<WriteResult> {
  const parsed = reclassifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.failed };
  if (!(await catalogOrganization()))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reclassify_master_audio", {
    p_file_id: parsed.data.fileId,
    p_state: parsed.data.state,
  });
  if (error) {
    if (error.message.includes("audio_locked"))
      return { ok: false, error: t.errors.locked };
    console.error("reclassifyAudioVersion:", error.message);
    return { ok: false, error: t.errors.failed };
  }
  refreshMaster(parsed.data.masterId);
  return { ok: true };
}

const commentSchema = ids.extend({
  atSeconds: z.number().int().min(0).max(86399).nullable(),
  body: z.string().trim().min(1).max(2000),
});

export async function commentAudioVersion(
  input: z.input<typeof commentSchema>,
): Promise<WriteResult> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.commentInvalid };
  const access = await requireApproved();
  if (!access.organizationId)
    return { ok: false, error: fr.auth.errors.forbidden };
  const { masterId, fileId, atSeconds, body } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("master_file_comments").insert({
    organization_id: access.organizationId,
    master_id: masterId,
    file_id: fileId,
    at_seconds: atSeconds,
    body,
  });
  if (error) {
    console.error("commentAudioVersion:", error.message);
    return { ok: false, error: t.errors.commentFailed };
  }
  refreshMaster(masterId);
  return { ok: true };
}
