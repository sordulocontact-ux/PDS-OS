"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  assignmentRef,
  assignSchema,
  availabilitySchema,
  invalidNeed,
  needForbidden,
  needNotFound,
  needRef,
  needSchema,
  needsFailure,
  parseHolder,
  type NeedInput,
} from "@/lib/production/needs-rules";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

// The human needs of a production sheet and who holds them (parcours 3).
// Written with the user's session: RLS lets only the project's owner write,
// while the « production » stage runs; the triggers keep a position within
// its count and write who set an availability.

/** « Ajouter un poste »: only a person adds a need, PO's suggestions are
 * never stored. */
export async function addProductionNeed(
  input: NeedInput & { sheetId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = needSchema.safeParse(input);
  const sheetId = z.uuid().safeParse(input.sheetId);
  if (!parsed.success || !sheetId.success) return invalidNeed;
  const n = parsed.data;
  const supabase = await createClient();
  const [sheetRes, lastRes] = await Promise.all([
    supabase
      .from("production_sheets")
      .select("organization_id")
      .eq("id", sheetId.data)
      .eq("project_id", n.projectId)
      .maybeSingle(),
    supabase
      .from("production_needs")
      .select("position")
      .eq("sheet_id", sheetId.data)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!sheetRes.data) return needNotFound;
  const { error } = await supabase.from("production_needs").insert({
    organization_id: sheetRes.data.organization_id,
    project_id: n.projectId,
    sheet_id: sheetId.data,
    family: n.family,
    role_key: n.roleKey,
    label: n.label,
    speciality: n.speciality,
    headcount: n.headcount,
    note: n.note,
    position: (lastRes.data?.position ?? -1) + 1,
  });
  return error ? needsFailure(error) : prepDone(n.projectId);
}

/** « Modifier »: the position, its count, speciality and note; the family
 * stays. */
export async function updateProductionNeed(
  input: NeedInput & { needId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = needSchema.safeParse(input);
  const needId = z.uuid().safeParse(input.needId);
  if (!parsed.success || !needId.success) return invalidNeed;
  const n = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_needs")
    .update({
      role_key: n.roleKey,
      label: n.label,
      speciality: n.speciality,
      headcount: n.headcount,
      note: n.note,
    })
    .eq("id", needId.data)
    .eq("project_id", n.projectId)
    .eq("family", n.family)
    .select("id");
  if (error) return needsFailure(error);
  return data?.length ? prepDone(n.projectId) : needForbidden;
}

/** « Supprimer » (confirmed): the need and its assignments. */
export async function deleteProductionNeed(
  input: z.input<typeof needRef>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = needRef.safeParse(input);
  if (!parsed.success) return invalidNeed;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_needs")
    .delete()
    .eq("id", parsed.data.needId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return needsFailure(error);
  return data?.length ? prepDone(parsed.data.projectId) : needForbidden;
}

/** « Affecter »: a member or a contact holds the position (one person may
 * hold several); the availability is the one the person chose. */
export async function assignProductionNeed(
  input: z.input<typeof assignSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = assignSchema.safeParse(input);
  const holder = parsed.success ? parseHolder(parsed.data.holder) : null;
  if (!parsed.success || !holder) return invalidNeed;
  const { projectId, needId } = parsed.data;
  const supabase = await createClient();
  const { data: need } = await supabase
    .from("production_needs")
    .select("organization_id")
    .eq("id", needId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!need) return needNotFound;
  const { error } = await supabase.from("production_assignments").insert({
    organization_id: need.organization_id,
    project_id: projectId,
    need_id: needId,
    person_id: holder.kind === "person" ? holder.id : null,
    contact_id: holder.kind === "contact" ? holder.id : null,
    availability: parsed.data.availability,
    note: parsed.data.note,
  });
  return error ? needsFailure(error) : prepDone(projectId);
}

/** « Retirer du poste » (confirmed). */
export async function removeProductionAssignment(
  input: z.input<typeof assignmentRef>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = assignmentRef.safeParse(input);
  if (!parsed.success) return invalidNeed;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_assignments")
    .delete()
    .eq("id", parsed.data.assignmentId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return needsFailure(error);
  return data?.length ? prepDone(parsed.data.projectId) : needForbidden;
}

/** « Changer la disponibilité »: what the person answered, set by a human;
 * the trigger writes who and when. */
export async function setAssignmentAvailability(
  input: z.input<typeof availabilitySchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return invalidNeed;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_assignments")
    .update({ availability: parsed.data.availability, note: parsed.data.note })
    .eq("id", parsed.data.assignmentId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return needsFailure(error);
  return data?.length ? prepDone(parsed.data.projectId) : needForbidden;
}
