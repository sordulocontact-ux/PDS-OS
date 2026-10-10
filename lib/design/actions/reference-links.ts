"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  designDone,
  designError,
  refreshConception,
  type DesignResult,
} from "@/lib/design/actions/shared";
import {
  addLinks,
  existingReference,
  invalid,
  targets,
  text,
  type ReferenceResult,
} from "@/lib/design/reference-db";
import {
  DIRECTION_TARGET,
  REFERENCE_BUCKET,
} from "@/lib/design/reference-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Link references, targets, edits and removal (étape 6), with the user's
// session: RLS lets the writers of the Conception in (design_can_write).

const linkSchema = z.object({
  projectId: z.uuid(),
  url: z
    .string()
    .trim()
    .max(2000)
    .regex(/^https:\/\/\S+$/),
  title: text(200),
  note: text(500),
  targets,
});

/** A link reference; an address already gathered only gains links. */
export async function addLinkReference(
  input: z.input<typeof linkSchema>,
): Promise<ReferenceResult> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const access = await requireApproved();
  if (!access.organizationId) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  let id = await existingReference(supabase, v.projectId, { url: v.url });
  const deduped = id !== null;
  if (!id) {
    const { data, error } = await supabase
      .from("design_references")
      .insert({
        organization_id: access.organizationId,
        project_id: v.projectId,
        kind: "link",
        url: v.url,
        title: v.title,
        note: v.note,
      })
      .select("id")
      .single();
    if (error || !data)
      return { ok: false, error: designError(error ?? { message: "" }) };
    id = data.id;
  }
  const error = await addLinks(
    supabase,
    access.organizationId,
    v.projectId,
    id,
    v.targets,
  );
  if (error) return { ok: false, error: designError(error) };
  refreshConception(v.projectId);
  return { ok: true, deduped };
}

/** « Rattacher »: the reference serves exactly these targets (none = à rattacher). */
export async function setReferenceTargets(
  projectId: string,
  referenceId: string,
  keys: string[],
): Promise<DesignResult> {
  const parsed = z
    .object({ projectId: z.uuid(), referenceId: z.uuid(), keys: targets })
    .safeParse({ projectId, referenceId, keys });
  if (!parsed.success) return invalid();
  const access = await requireApproved();
  if (!access.organizationId) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { data: links, error: readError } = await supabase
    .from("design_reference_links")
    .select("id, design_deliverable_id")
    .eq("reference_id", v.referenceId)
    .eq("project_id", v.projectId);
  if (readError) return designDone(projectId, readError, "setReferenceTargets");
  const wanted = new Set(v.keys);
  const stale = (links ?? [])
    .filter((l) => !wanted.has(l.design_deliverable_id ?? DIRECTION_TARGET))
    .map((l) => l.id);
  if (stale.length) {
    const { error } = await supabase
      .from("design_reference_links")
      .delete()
      .in("id", stale);
    if (error) return designDone(projectId, error, "setReferenceTargets");
  }
  const error = await addLinks(
    supabase,
    access.organizationId,
    v.projectId,
    v.referenceId,
    v.keys,
  );
  return designDone(projectId, error, "setReferenceTargets");
}

export async function updateReference(
  projectId: string,
  referenceId: string,
  title: string,
  note: string,
): Promise<DesignResult> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      referenceId: z.uuid(),
      title: text(200),
      note: text(500),
    })
    .safeParse({ projectId, referenceId, title, note });
  if (!parsed.success) return invalid();
  await requireApproved();
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_references")
    .update({ title: v.title, note: v.note })
    .eq("id", v.referenceId)
    .eq("project_id", v.projectId)
    .select("id");
  if (!error && (data ?? []).length === 0)
    return { ok: false, error: fr.conception.errors.notAllowed };
  return designDone(projectId, error, "updateReference");
}

/** « Retirer »: the row (and its links), then the stored object. */
export async function removeReference(
  projectId: string,
  referenceId: string,
): Promise<DesignResult> {
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(referenceId).success
  )
    return invalid();
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_references")
    .delete()
    .eq("id", referenceId)
    .eq("project_id", projectId)
    .select("path");
  // RLS hides what it refuses: nothing deleted means not allowed.
  if (!error && (data ?? []).length === 0)
    return { ok: false, error: fr.conception.errors.notAllowed };
  const path = data?.[0]?.path;
  if (!error && path) {
    const removed = await supabase.storage
      .from(REFERENCE_BUCKET)
      .remove([path]);
    if (removed.error)
      console.error("removeReference (object):", removed.error.message);
  }
  return designDone(projectId, error, "removeReference");
}
