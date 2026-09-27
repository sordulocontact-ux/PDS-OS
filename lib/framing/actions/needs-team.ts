"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  FAMILIES,
  REVIEW,
  done,
  id,
  orgId,
  text,
} from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { createClient } from "@/lib/supabase/server";

// Team ----------------------------------------------------------------------

export async function reviewTeamMember(
  projectId: string,
  memberId: string,
  status: (typeof REVIEW)[number],
): Promise<ActionResult> {
  if (
    !id.safeParse(memberId).success ||
    !z.enum(REVIEW).safeParse(status).success
  )
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_team_members")
    .update({ review_status: status })
    .eq("id", memberId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

const selection = z.object({
  projectId: id,
  add: z
    .array(z.object({ label: text(200), family: z.enum(FAMILIES) }))
    .max(50),
  remove: z.array(id).max(50),
});

/**
 * "Confirmer cette sélection" of the Besoins & activations screen, in one
 * go: the chips clicked on are added, the ones clicked off are rejected, and
 * every need still proposed is confirmed. Nothing is written while clicking.
 */
export async function saveNeedsSelection(
  projectId: string,
  // The family is checked here (FAMILIES), not trusted from the client.
  add: Array<{ label: string; family: string }>,
  remove: string[],
): Promise<ActionResult> {
  const p = selection.safeParse({ projectId, add, remove });
  const organizationId = await orgId();
  if (!p.success || !organizationId) return fail("invalid_input");
  const supabase = await createClient();

  if (p.data.remove.length) {
    const { error } = await supabase
      .from("needs")
      .update({ review_status: "rejected" })
      .eq("project_id", projectId)
      .in("id", p.data.remove);
    if (error) return done(projectId, error);
  }
  if (p.data.add.length) {
    const { error } = await supabase.from("needs").insert(
      p.data.add.map((need) => ({
        organization_id: organizationId,
        project_id: projectId,
        label: need.label,
        family: need.family,
      })),
    );
    if (error) return done(projectId, error);
  }
  const { error } = await supabase
    .from("needs")
    .update({ review_status: "confirmed" })
    .eq("project_id", projectId)
    .eq("review_status", "proposed");
  return done(projectId, error);
}
