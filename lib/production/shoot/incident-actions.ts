"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { parseHolder } from "@/lib/production/needs-rules";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { invalidInput, shootFailure } from "@/lib/production/shoot/result";
import { createClient } from "@/lib/supabase/server";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

const incidentSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  // null = a new incident.
  incidentId: z.uuid().nullable(),
  title: z.string().trim().min(1).max(200),
  impact: optionalText(2000),
  // "person:<uuid>", "contact:<uuid>" or "" for nobody yet.
  holder: z.string().trim().max(80),
  followUp: optionalText(2000),
  // A person's choice, never automatic.
  blocksClosing: z.boolean(),
  blocksPost: z.boolean(),
});

/** « Signaler un incident » / « Modifier »: impact, who follows it, the
 * follow-up, and what it blocks if the person says so. */
export async function saveShootIncident(
  input: z.input<typeof incidentSchema>,
): Promise<PrepResult> {
  const parsed = incidentSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  const d = parsed.data;
  const holder = d.holder === "" ? null : parseHolder(d.holder);
  if (d.holder !== "" && !holder) return invalidInput;
  const fields = {
    title: d.title,
    impact: d.impact,
    person_id: holder?.kind === "person" ? holder.id : null,
    contact_id: holder?.kind === "contact" ? holder.id : null,
    follow_up: d.followUp,
    blocks_closing: d.blocksClosing,
    blocks_post: d.blocksPost,
  };
  const access = await requireApproved();
  if (!access.organizationId) return shootFailure({ code: "42501" });
  const supabase = await createClient();
  const { error } = d.incidentId
    ? await supabase
        .from("production_incidents")
        .update(fields)
        .eq("id", d.incidentId)
        .eq("project_id", d.projectId)
    : await supabase.from("production_incidents").insert({
        ...fields,
        organization_id: access.organizationId,
        project_id: d.projectId,
        sheet_id: d.sheetId,
      });
  return error ? shootFailure(error) : prepDone(d.projectId);
}

const resolveSchema = z.object({
  projectId: z.uuid(),
  incidentId: z.uuid(),
  // "" reopens: who and when are cleared by the database.
  resolution: z.string().trim().max(2000),
});

/** « Résoudre » with what was done, or « Rouvrir » (empty resolution). */
export async function resolveShootIncident(
  input: z.input<typeof resolveSchema>,
): Promise<PrepResult> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  const d = parsed.data;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_incidents")
    .update({ resolution: d.resolution === "" ? null : d.resolution })
    .eq("id", d.incidentId)
    .eq("project_id", d.projectId);
  return error ? shootFailure(error) : prepDone(d.projectId);
}

const deleteSchema = z.object({ projectId: z.uuid(), incidentId: z.uuid() });

export async function deleteShootIncident(
  input: z.input<typeof deleteSchema>,
): Promise<PrepResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_incidents")
    .delete()
    .eq("id", parsed.data.incidentId)
    .eq("project_id", parsed.data.projectId);
  return error ? shootFailure(error) : prepDone(parsed.data.projectId);
}
