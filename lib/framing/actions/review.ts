"use server";

import { z } from "zod";

import { done, id, orgId } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { createClient } from "@/lib/supabase/server";

const TABLES = {
  needs: "needs",
  frame: "framing_constraints",
  team: "project_team_members",
} as const;

/**
 * "Confirmer cette sélection / le cadre / l'équipe": every line still
 * proposed on that screen becomes confirmed, in one click, after the person
 * has seen them all. Lines already confirmed or rejected are untouched.
 */
export async function confirmProposed(
  projectId: string,
  step: keyof typeof TABLES,
): Promise<ActionResult> {
  const p = z
    .object({ projectId: id, step: z.enum(["needs", "frame", "team"]) })
    .safeParse({ projectId, step });
  if (!p.success || !(await orgId())) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLES[p.data.step])
    .update({ review_status: "confirmed" })
    .eq("project_id", projectId)
    .eq("review_status", "proposed");
  return done(projectId, error);
}
