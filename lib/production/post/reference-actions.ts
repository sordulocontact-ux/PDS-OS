"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  forbiddenPost,
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

// References of the edit (parcours 14): added by the owner while Production
// runs (RLS). Those of the Fiche Livrable are never copied here.

const base = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  title: optionalText(200),
  note: optionalText(2000),
});

const referenceSchema = z.discriminatedUnion("kind", [
  base.extend({ kind: z.literal("link"), url: httpsUrl }),
  base.extend({ kind: z.literal("file"), fileId: z.uuid() }),
  base.extend({
    kind: z.literal("note"),
    note: z.string().trim().min(1).max(2000),
  }),
]);

export async function addPostReference(
  input: z.input<typeof referenceSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = referenceSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const r = parsed.data;
  const supabase = await createClient();
  const organizationId = await sheetOrganization(
    supabase,
    r.projectId,
    r.sheetId,
  );
  if (!organizationId) return notFoundPost;
  const { error } = await supabase.from("production_post_references").insert({
    organization_id: organizationId,
    project_id: r.projectId,
    sheet_id: r.sheetId,
    kind: r.kind,
    title: r.title,
    note: r.note,
    url: r.kind === "link" ? r.url : null,
    file_id: r.kind === "file" ? r.fileId : null,
  });
  return error ? postFailure(error) : prepDone(r.projectId);
}

const refSchema = z.object({ projectId: z.uuid(), referenceId: z.uuid() });

export async function deletePostReference(
  input: z.input<typeof refSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = refSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_post_references")
    .delete()
    .eq("id", parsed.data.referenceId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return postFailure(error);
  return data.length === 0 ? forbiddenPost : prepDone(parsed.data.projectId);
}
