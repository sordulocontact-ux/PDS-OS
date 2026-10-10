"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  POST_STEP_KEYS,
  POST_STEP_STATUSES,
} from "@/lib/production/post/rules";
import {
  forbiddenPost,
  holderSchema,
  invalidPost,
  notFoundPost,
  optionalText,
  postFailure,
  sheetOrganization,
  type PostResult,
} from "@/lib/production/post/result";
import { prepDone } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

// The steps of the postproduction (parcours 15): PO's suggestions are never
// stored; a step exists once the owner adds it, and who does it, the
// responsibilities, dates and access are the owner's confirmation (RLS:
// owner while Production runs).

const isoDate = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(z.iso.date().nullable());

const stepSchema = z
  .object({
    projectId: z.uuid(),
    sheetId: z.uuid(),
    // Absent: a new step.
    stepId: z.uuid().optional(),
    key: z.enum(POST_STEP_KEYS),
    label: optionalText(120),
    holder: holderSchema,
    responsibilities: optionalText(2000),
    accessNote: optionalText(1000),
    startsOn: isoDate,
    endsOn: isoDate,
    status: z.enum(POST_STEP_STATUSES),
  })
  .refine((s) => s.key !== "other" || s.label !== null)
  .refine((s) => !s.startsOn || !s.endsOn || s.startsOn <= s.endsOn);

export async function savePostStep(
  input: z.input<typeof stepSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const s = parsed.data;
  const fields = {
    step_key: s.key,
    label: s.key === "other" ? s.label : null,
    person_id: s.holder.personId,
    contact_id: s.holder.contactId,
    responsibilities: s.responsibilities,
    access_note: s.accessNote,
    starts_on: s.startsOn,
    ends_on: s.endsOn,
    status: s.status,
  };
  const supabase = await createClient();

  if (s.stepId) {
    const { data, error } = await supabase
      .from("production_post_steps")
      .update(fields)
      .eq("id", s.stepId)
      .eq("sheet_id", s.sheetId)
      .select("id");
    if (error) return postFailure(error);
    return data.length === 0 ? forbiddenPost : prepDone(s.projectId);
  }

  const [organizationId, lastRes] = await Promise.all([
    sheetOrganization(supabase, s.projectId, s.sheetId),
    supabase
      .from("production_post_steps")
      .select("position")
      .eq("sheet_id", s.sheetId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!organizationId) return notFoundPost;
  const { error } = await supabase.from("production_post_steps").insert({
    ...fields,
    organization_id: organizationId,
    project_id: s.projectId,
    sheet_id: s.sheetId,
    position: (lastRes.data?.position ?? -1) + 1,
  });
  return error ? postFailure(error) : prepDone(s.projectId);
}

const refSchema = z.object({ projectId: z.uuid(), stepId: z.uuid() });

export async function deletePostStep(
  input: z.input<typeof refSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = refSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_post_steps")
    .delete()
    .eq("id", parsed.data.stepId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return postFailure(error);
  return data.length === 0 ? forbiddenPost : prepDone(parsed.data.projectId);
}
