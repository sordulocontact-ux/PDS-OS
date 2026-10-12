"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  FAMILIES,
  REVIEW,
  id,
  orgId,
  text,
} from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { isLegalItem } from "@/lib/strategy/legal-items";
import { createClient } from "@/lib/supabase/server";

const STATES = ["to_decide", "selected", "rejected"] as const;

export async function addLever(
  projectId: string,
  label: string,
  family: string,
): Promise<ActionResult> {
  const p = z
    .object({ projectId: id, label: text(200), family: z.enum(FAMILIES) })
    .safeParse({ projectId, label, family });
  const organizationId = await orgId();
  if (!p.success || !organizationId) return fail("invalid_input");
  if (isLegalItem(p.data.label)) return fail("legal_not_lever");
  const supabase = await createClient();
  const { error } = await supabase.from("levers").insert({
    organization_id: organizationId,
    project_id: projectId,
    label: p.data.label,
    family: p.data.family,
  });
  return done(projectId, error);
}

/** A Brief need becomes a lever to decide on, keeping the link to the need. */
export async function leverFromNeed(
  projectId: string,
  needId: string,
): Promise<ActionResult> {
  const organizationId = await orgId();
  if (!id.safeParse(needId).success || !organizationId)
    return fail("invalid_input");
  const supabase = await createClient();
  const { data: need } = await supabase
    .from("needs")
    .select("id, label, family")
    .eq("id", needId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!need) return fail("not_found");
  if (isLegalItem(need.label)) return fail("legal_not_lever");
  const { error } = await supabase.from("levers").insert({
    organization_id: organizationId,
    project_id: projectId,
    label: need.label,
    family: need.family,
    need_id: need.id,
  });
  return done(projectId, error);
}

const leverPatch = z.object({
  state: z.enum(STATES).optional(),
  review_status: z.enum(REVIEW).optional(),
});

export async function updateLever(
  projectId: string,
  leverId: string,
  patch: z.input<typeof leverPatch>,
): Promise<ActionResult> {
  const p = leverPatch.safeParse(patch);
  if (!p.success || !id.safeParse(leverId).success)
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("levers")
    .update(p.data)
    .eq("id", leverId)
    .eq("project_id", projectId);
  return done(projectId, error);
}
