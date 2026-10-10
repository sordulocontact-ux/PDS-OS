"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import { equipmentRow, equipmentSchema } from "./equipment-input";
import {
  changed,
  forbidden,
  invalid,
  nextPosition,
  preprodFailure,
  sheetOrg,
} from "./result";

// The equipment list (parcours 8, MVP: manual list and quotes kept as
// sources). Nothing here is a booking. RLS: the owner, while Production runs.

/** « Ajouter un article », or « Saisir depuis ce devis » (then the line
 * starts « À vérifier », linked to its document). */
export async function addEquipment(
  input: z.input<typeof equipmentSchema> & { sheetId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = equipmentSchema.safeParse(input);
  const sheetId = z.uuid().safeParse(input.sheetId);
  if (!parsed.success || !sheetId.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const org = await sheetOrg(supabase, p.projectId, sheetId.data);
  if (!org) return forbidden;
  const { error } = await supabase.from("production_equipment").insert({
    ...equipmentRow(p),
    status: p.quoteFileId ? "to_verify" : p.status,
    quote_file_id: p.quoteFileId,
    organization_id: org,
    project_id: p.projectId,
    sheet_id: sheetId.data,
    position: await nextPosition(
      supabase,
      "production_equipment",
      sheetId.data,
    ),
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

/** « Modifier »: a line « À vérifier » keeps that state until « Marquer
 * vérifiée ». */
export async function updateEquipment(
  input: z.input<typeof equipmentSchema> & { equipmentId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = equipmentSchema.safeParse(input);
  const equipmentId = z.uuid().safeParse(input.equipmentId);
  if (!parsed.success || !equipmentId.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("production_equipment")
    .select("status")
    .eq("id", equipmentId.data)
    .maybeSingle();
  const { data, error } = await supabase
    .from("production_equipment")
    .update({
      ...equipmentRow(p),
      status: current?.status === "to_verify" ? "to_verify" : p.status,
    })
    .eq("id", equipmentId.data)
    .eq("project_id", p.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(p.projectId) : forbidden;
}

const refSchema = z.object({ projectId: z.uuid(), equipmentId: z.uuid() });

/** « Marquer vérifiée »: read against its quote by a person; the database
 * writes who and when. The line becomes « Devis reçu ». */
export async function verifyEquipment(
  input: z.input<typeof refSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = refSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_equipment")
    .update({ status: "quoted" })
    .eq("id", parsed.data.equipmentId)
    .eq("project_id", parsed.data.projectId)
    .eq("status", "to_verify")
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(parsed.data.projectId) : forbidden;
}

/** « Supprimer » (confirmed). */
export async function deleteEquipment(
  input: z.input<typeof refSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = refSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_equipment")
    .delete()
    .eq("id", parsed.data.equipmentId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(parsed.data.projectId) : forbidden;
}

const mergeSchema = z.object({
  projectId: z.uuid(),
  keepId: z.uuid(),
  otherId: z.uuid(),
});

/** « Rapprocher » two lines the person confirmed are the same item: the
 * first is kept, quantities add up, the other is removed. Never automatic. */
export async function mergeEquipment(
  input: z.input<typeof mergeSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = mergeSchema.safeParse(input);
  if (!parsed.success || parsed.data.keepId === parsed.data.otherId)
    return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("production_equipment")
    .select("id, quantity")
    .in("id", [p.keepId, p.otherId])
    .eq("project_id", p.projectId);
  const keep = rows?.find((r) => r.id === p.keepId);
  const other = rows?.find((r) => r.id === p.otherId);
  if (!keep || !other) return forbidden;
  const quantity =
    keep.quantity === null && other.quantity === null
      ? null
      : Math.min(1000, (keep.quantity ?? 1) + (other.quantity ?? 1));
  const { data, error } = await supabase
    .from("production_equipment")
    .update({ quantity })
    .eq("id", p.keepId)
    .select("id");
  if (error) return preprodFailure(error);
  if (!changed(data)) return forbidden;
  return deleteEquipment({ projectId: p.projectId, equipmentId: p.otherId });
}
