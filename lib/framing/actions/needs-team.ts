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

// Needs ---------------------------------------------------------------------

export async function addNeed(
  projectId: string,
  label: string,
  family: string,
): Promise<ActionResult> {
  const p = z
    .object({ projectId: id, label: text(200), family: z.enum(FAMILIES) })
    .safeParse({ projectId, label, family });
  const organizationId = await orgId();
  if (!p.success || !organizationId) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("needs").insert({
    organization_id: organizationId,
    project_id: projectId,
    label: p.data.label,
    family: p.data.family,
  });
  return done(projectId, error);
}

const needPatch = z.object({
  label: text(200).optional(),
  family: z.enum(FAMILIES).optional(),
  state: z.enum(["identified", "committed"]).optional(),
  review_status: z.enum(REVIEW).optional(),
});

export async function updateNeed(
  projectId: string,
  needId: string,
  patch: z.input<typeof needPatch>,
): Promise<ActionResult> {
  const p = needPatch.safeParse(patch);
  if (!p.success || !id.safeParse(needId).success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("needs")
    .update(p.data)
    .eq("id", needId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

// Team ----------------------------------------------------------------------

export async function addTeamMember(
  projectId: string,
  displayName: string,
  role: string,
): Promise<ActionResult> {
  const p = z
    .object({ displayName: text(120), role: z.string().trim().max(120) })
    .safeParse({ displayName, role });
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("project_team_members").insert({
    organization_id: organizationId,
    project_id: projectId,
    display_name: p.data.displayName,
    role: p.data.role || null,
  });
  return done(projectId, error);
}

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
