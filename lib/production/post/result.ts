import "server-only";

import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { prepFailure } from "@/lib/production/prep-result";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// The outcome of a postproduction write: `notice` when it went through with
// something to say (a version kept as a draft for want of a file or a link).
export type PostResult =
  { ok: true; notice?: string } | { ok: false; error: string };

const e = fr.productionPost.errors;

export const invalidPost: PostResult = { ok: false, error: e.invalid };
export const forbiddenPost: PostResult = { ok: false, error: e.forbidden };
export const notFoundPost: PostResult = { ok: false, error: e.notFound };

/** The postproduction's own refusals first, then the preparation's. */
export function postFailure(error: {
  code?: string;
  message?: string;
}): PostResult {
  const message = error.message ?? "";
  const known: [string, string][] = [
    ["version_without_media", e.withoutMedia],
    ["invalid_transition", e.transition],
    ["reason_required", e.reasonRequired],
    ["verify_first", e.verifyFirst],
    ["version_not_submitted", e.notSubmitted],
    ["version_submitted", e.submitted],
    ["version_not_found", e.notFound],
    ["person_not_member", e.notMember],
    ["contact_not_found", e.contactNotFound],
    ["recipient_required", e.recipientRequired],
    ["due_required", e.dueRequired],
    ["due_in_past", e.dueInPast],
    ["nothing_to_correct", e.nothingToCorrect],
    ["comment_not_pending", e.commentNotPending],
    ["request_treated", e.requestTreated],
    ["request_not_found", e.notFound],
    ["step_without_holder", fr.productionPost.steps.withoutHolder],
  ];
  const hit = known.find(([key]) => message.includes(key));
  return hit ? { ok: false, error: hit[1] } : prepFailure(error);
}

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const httpsUrl = z
  .string()
  .trim()
  .max(2000)
  .regex(/^https:\/\/\S+$/);

// "person:<uuid>" (a member), "contact:<uuid>" (the Réseau) or "" (nobody).
export const holderSchema = z
  .string()
  .trim()
  .max(80)
  .transform((value, ctx) => {
    if (value === "" || value === "none")
      return { personId: null, contactId: null };
    const [kind, id] = value.split(":");
    const uuid = z.uuid().safeParse(id);
    if (!uuid.success || (kind !== "person" && kind !== "contact")) {
      ctx.addIssue({ code: "custom", message: "holder" });
      return z.NEVER;
    }
    return kind === "person"
      ? { personId: uuid.data, contactId: null }
      : { personId: null, contactId: uuid.data };
  });

/** The sheet's organisation, when it is this project's (RLS: visible). */
export async function sheetOrganization(
  supabase: Client,
  projectId: string,
  sheetId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("production_sheets")
    .select("organization_id")
    .eq("id", sheetId)
    .eq("project_id", projectId)
    .maybeSingle();
  return data?.organization_id ?? null;
}
