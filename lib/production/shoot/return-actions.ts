"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { parseHolder } from "@/lib/production/needs-rules";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { invalidInput, shootFailure } from "@/lib/production/shoot/result";
import { RETURN_STATUSES } from "@/lib/production/shoot/rules";
import { createClient } from "@/lib/supabase/server";

const statusSchema = z.object({
  projectId: z.uuid(),
  equipmentId: z.uuid(),
  // « Rendu » only after the person confirmed it on screen; who and when
  // are stamped by the database.
  status: z.enum(["picked_up", "on_site", "to_return", "returned", "incident"]),
  // Required for an incident (the database checks it too).
  incidentNote: z.string().trim().max(1000),
  // An incident's nature (PROD-022): missing or damaged.
  issue: z.enum(["missing", "damaged"]).nullable().default(null),
});

/** Moves a confirmed line along its return. Only lines already confirmed
 * (from « Réservé confirmé » on) are touched here; the rest belongs to the
 * Préproduction. */
export async function setEquipmentReturnStatus(
  input: z.input<typeof statusSchema>,
): Promise<PrepResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  const d = parsed.data;
  if (d.status === "incident" && d.incidentNote === "")
    return shootFailure({ message: "production_equipment_incident_check" });
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_equipment")
    .update({
      status: d.status,
      ...(d.status === "incident"
        ? { incident_note: d.incidentNote, return_issue: d.issue }
        : { return_issue: null }),
    })
    .eq("id", d.equipmentId)
    .eq("project_id", d.projectId)
    .in("status", [...RETURN_STATUSES]);
  return error ? shootFailure(error) : prepDone(d.projectId);
}

const holderSchema = z.object({
  projectId: z.uuid(),
  equipmentId: z.uuid(),
  // "person:<uuid>", "contact:<uuid>" or "" for nobody yet.
  holder: z.string().trim().max(80),
  returnDue: z.union([z.iso.date(), z.literal("")]),
});

/** Who brings a confirmed line back, and before when. */
export async function setEquipmentReturnHolder(
  input: z.input<typeof holderSchema>,
): Promise<PrepResult> {
  const parsed = holderSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  const d = parsed.data;
  const holder = d.holder === "" ? null : parseHolder(d.holder);
  if (d.holder !== "" && !holder) return invalidInput;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_equipment")
    .update({
      return_person_id: holder?.kind === "person" ? holder.id : null,
      return_contact_id: holder?.kind === "contact" ? holder.id : null,
      return_due: d.returnDue === "" ? null : d.returnDue,
    })
    .eq("id", d.equipmentId)
    .eq("project_id", d.projectId)
    .in("status", [...RETURN_STATUSES]);
  return error ? shootFailure(error) : prepDone(d.projectId);
}
