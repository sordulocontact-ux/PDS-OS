"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { loadProductionSheet } from "@/lib/production/sheet";
import { createClient } from "@/lib/supabase/server";

import { forbidden, invalid, preprodFailure, sheetOrg } from "./result";
import { cleanFields, teamBriefContent, TEAMS } from "./team-briefs";

const briefSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  team: z.enum(TEAMS),
  fields: z.record(z.string(), z.string().max(4000)),
});

/** « Compléter »: the team's own fields (the extract is computed, never
 * stored here). */
export async function saveTeamBrief(
  input: z.input<typeof briefSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = briefSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const fields = cleanFields(p.team, p.fields);
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("production_team_briefs")
    .update({ fields })
    .eq("sheet_id", p.sheetId)
    .eq("project_id", p.projectId)
    .eq("team", p.team)
    .select("id");
  if (error) return preprodFailure(error);
  if (updated.length > 0) return prepDone(p.projectId);
  const org = await sheetOrg(supabase, p.projectId, p.sheetId);
  if (!org) return forbidden;
  const { error: insertError } = await supabase
    .from("production_team_briefs")
    .insert({
      organization_id: org,
      project_id: p.projectId,
      sheet_id: p.sheetId,
      team: p.team,
      fields,
    });
  return insertError ? preprodFailure(insertError) : prepDone(p.projectId);
}

const transmitSchema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid(),
  team: z.enum(TEAMS),
});

/** « Transmettre »: the server rebuilds what the team receives from the
 * sheet as it stands (never from the client) and the database keeps it
 * with the source version. */
export async function transmitTeamBrief(
  input: z.input<typeof transmitSchema>,
): Promise<PrepResult> {
  const access = await requireApproved();
  const parsed = transmitSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const data = await loadProductionSheet(p.projectId, p.deliverableId, access);
  if (!data?.sheet) return invalid;
  if (!data.canOrganize) return forbidden;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("production_team_briefs")
    .select("fields")
    .eq("sheet_id", data.sheet.id)
    .eq("team", p.team)
    .maybeSingle();
  const content = teamBriefContent(
    p.team,
    data,
    cleanFields(p.team, row?.fields),
  );
  const { error } = await supabase.rpc("transmit_production_team_brief", {
    p_sheet_id: data.sheet.id,
    p_team: p.team,
    p_snapshot: content,
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}
