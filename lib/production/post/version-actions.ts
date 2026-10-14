"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { VERSION_TARGETS } from "@/lib/production/post/rules";
import {
  forbiddenPost,
  holderSchema,
  httpsUrl,
  invalidPost,
  notFoundPost,
  optionalText,
  postFailure,
  sheetOrganization,
  type PostResult,
} from "@/lib/production/post/result";
import { prepDone } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";
import { schedulePendingPushes } from "@/lib/notifications/push";

// Versions V1, V2, V3… (parcours 16): numbered by the database only
// (PROD-029), following the one before (PROD-032). The owner deposits for the
// provider, who stays the author. A version is inserted as a draft, then
// submitted once to the feedback (submit_production_version, PROD-033) —
// the validators are notified; without a file or a link it stays a draft.
// Only a draft is edited or removed (RLS and trigger).

const t = fr.productionPost.versions;

const versionSchema = z
  .object({
    projectId: z.uuid(),
    sheetId: z.uuid(),
    // Absent: a new version.
    versionId: z.uuid().optional(),
    holder: holderSchema,
    fileId: z.uuid().nullable(),
    url: z.union([httpsUrl, z.literal("")]).transform((v) => v || null),
    notes: optionalText(4000),
    target: z.enum(VERSION_TARGETS),
  })
  .refine((v) => v.fileId === null || v.url === null);

export async function savePostVersion(
  input: z.input<typeof versionSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const v = parsed.data;
  const fields = {
    person_id: v.holder.personId,
    contact_id: v.holder.contactId,
    file_id: v.fileId,
    url: v.url,
    notes: v.notes,
  };
  const supabase = await createClient();

  let versionId = v.versionId ?? null;
  if (versionId) {
    const { data, error } = await supabase
      .from("production_versions")
      .update(fields)
      .eq("id", versionId)
      .eq("sheet_id", v.sheetId)
      .select("id");
    if (error) return postFailure(error);
    if (data.length === 0) return forbiddenPost;
  } else {
    const organizationId = await sheetOrganization(
      supabase,
      v.projectId,
      v.sheetId,
    );
    if (!organizationId) return notFoundPost;
    const { data, error } = await supabase
      .from("production_versions")
      .insert({
        ...fields,
        organization_id: organizationId,
        project_id: v.projectId,
        sheet_id: v.sheetId,
      })
      .select("id")
      .single();
    if (error || !data) return postFailure(error ?? {});
    versionId = data.id;
  }

  if (v.target === "draft") return prepDone(v.projectId);
  // No file nor link: saved, but it stays a draft (never submitted empty).
  if (!v.fileId && !v.url) {
    prepDone(v.projectId);
    return { ok: true, notice: t.noMediaStaysDraft };
  }
  const { error } = await supabase.rpc("submit_production_version", {
    p_version_id: versionId,
    p_target: v.target,
  });
  if (error) {
    // The draft is saved either way (the page shows it): the refusal is a
    // notice, so the form closes instead of saving it twice.
    prepDone(v.projectId);
    const failure = postFailure(error);
    return failure.ok ? failure : { ok: true, notice: failure.error };
  }
  await schedulePendingPushes();
  return prepDone(v.projectId);
}

const submitSchema = z.object({ projectId: z.uuid(), versionId: z.uuid() });

/** « Soumettre aux retours » of a version already saved. */
export async function submitPostVersion(
  input: z.input<typeof submitSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_production_version", {
    p_version_id: parsed.data.versionId,
    p_target: "review",
  });
  if (error) return postFailure(error);
  await schedulePendingPushes();
  return prepDone(parsed.data.projectId);
}

const refSchema = z.object({ projectId: z.uuid(), versionId: z.uuid() });

/** Removes a draft; a submitted version, its feedback and decisions stay. */
export async function deletePostVersion(
  input: z.input<typeof refSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = refSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_versions")
    .delete()
    .eq("id", parsed.data.versionId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return postFailure(error);
  return data.length === 0 ? forbiddenPost : prepDone(parsed.data.projectId);
}
