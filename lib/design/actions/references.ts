"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, type DesignResult } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// References gathered while working (« Ajouter une référence »): links only
// for now; files come with the moodboards. RLS: design_can_write.

const referenceSchema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid().nullable(),
  url: z
    .string()
    .trim()
    .max(2000)
    .regex(/^https:\/\/\S+$/),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || null),
});

export async function addDesignReference(
  projectId: string,
  deliverableId: string | null,
  url: string,
  note: string,
): Promise<DesignResult> {
  const parsed = referenceSchema.safeParse({
    projectId,
    deliverableId,
    url,
    note,
  });
  if (!parsed.success)
    return { ok: false, error: fr.conceptionWork.references.urlInvalid };
  const access = await requireApproved();
  if (!access.organizationId)
    return { ok: false, error: fr.conception.errors.generic };
  const p = parsed.data;
  const supabase = await createClient();
  // One resource per address: a link already gathered is linked again,
  // never stored twice (design_references_url_key).
  const { data: existing } = await supabase
    .from("design_references")
    .select("id")
    .eq("project_id", p.projectId)
    .eq("url", p.url)
    .maybeSingle();
  let referenceId = existing?.id ?? null;
  if (!referenceId) {
    const { data: created, error } = await supabase
      .from("design_references")
      .insert({
        organization_id: access.organizationId,
        project_id: p.projectId,
        kind: "link",
        url: p.url,
        note: p.note,
      })
      .select("id")
      .single();
    if (error || !created)
      return designDone(projectId, error, "addDesignReference");
    referenceId = created.id;
  }
  const linkQuery = supabase
    .from("design_reference_links")
    .select("id")
    .eq("reference_id", referenceId);
  const { data: linked } = await (
    p.deliverableId
      ? linkQuery.eq("design_deliverable_id", p.deliverableId)
      : linkQuery.is("design_deliverable_id", null)
  ).maybeSingle();
  if (linked) return designDone(projectId, null, "addDesignReference");
  const { error } = await supabase.from("design_reference_links").insert({
    organization_id: access.organizationId,
    project_id: p.projectId,
    reference_id: referenceId,
    target: p.deliverableId ? "deliverable" : "direction",
    design_deliverable_id: p.deliverableId,
  });
  return designDone(projectId, error, "addDesignReference");
}

export async function removeDesignReference(
  projectId: string,
  referenceId: string,
): Promise<DesignResult> {
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(referenceId).success
  )
    return { ok: false, error: fr.conceptionWork.errors.invalid };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_references")
    .delete()
    .eq("id", referenceId)
    .eq("project_id", projectId)
    .select("id");
  // RLS hides what it refuses: nothing deleted means not allowed.
  if (!error && (data ?? []).length === 0)
    return { ok: false, error: fr.conception.errors.notAllowed };
  return designDone(projectId, error, "removeDesignReference");
}
