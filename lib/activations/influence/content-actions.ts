"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const e = fr.activationInfluence.errors;

const contentSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  targetId: z.uuid(),
  label: z.string().trim().min(1).max(80),
  url: z.union([z.url({ protocol: /^https?$/ }).max(2000), z.literal("")]),
  fileId: z.uuid().nullable(),
  note: z.string().max(2000),
});

/** « Déposer une version » : a file or a link, a free version label. */
export async function submitContent(
  input: z.input<typeof contentSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) return invalid(e.labelRequired);
  const v = parsed.data;
  if (!v.url && !v.fileId) return invalid(e.mediaRequired);
  const supabase = await createClient();
  const { error } = await supabase.from("influence_contents").insert({
    target_id: v.targetId,
    label: v.label,
    url: textOrNull(v.url),
    file_id: v.fileId,
    note: textOrNull(v.note),
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
    activation_id: v.activationId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const decideSchema = z.object({
  projectId: z.uuid(),
  contentId: z.uuid(),
  decision: z.enum(["approved", "changes_requested", "refused"]),
  comment: z.string().max(2000),
});

/** The decision on one precise version (a comment unless approved). */
export async function decideContent(
  input: z.input<typeof decideSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_influence_content", {
    p_content_id: v.contentId,
    p_decision: v.decision,
    p_comment: v.comment,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const feedbackSchema = z.object({
  projectId: z.uuid(),
  contentId: z.uuid(),
  timecode: z.union([
    z.string().regex(/^\d{1,2}(:\d{2}){1,2}$/),
    z.literal(""),
  ]),
  category: z.enum(["image", "sound", "text", "brand", "legal", "other"]),
  comment: z.string().trim().min(1).max(2000),
});

/** A timestamped feedback on a version. */
export async function addFeedback(
  input: z.input<typeof feedbackSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("influence_feedback").insert({
    content_id: v.contentId,
    timecode: textOrNull(v.timecode),
    category: v.category,
    comment: v.comment,
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

/** A feedback's status : « corrigé déclaré » is never « résolu » by itself. */
export async function setFeedbackStatus(input: {
  projectId: string;
  feedbackId: string;
  status: "open" | "sent_declared" | "declared_fixed" | "resolved" | "dropped";
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      feedbackId: z.uuid(),
      status: z.enum([
        "open",
        "sent_declared",
        "declared_fixed",
        "resolved",
        "dropped",
      ]),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase
    .from("influence_feedback")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.feedbackId);
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}
