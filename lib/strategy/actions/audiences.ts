"use server";

import { z } from "zod";

import { id, orgId } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { createClient } from "@/lib/supabase/server";

// Publics prioritaires, one row each (MKT-S1-05): segment, priority, need
// or insight, channel foreseen. Written by the owner while the strategy is
// in progress (RLS, strategy_is_editable).

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const audienceInput = z.object({
  id: z.uuid().optional(),
  segment: z.string().trim().min(1).max(120),
  priority: z.enum(["primary", "secondary"]),
  insight: optional(500),
  channel: optional(200),
});
export type AudienceInput = z.input<typeof audienceInput>;

export async function saveAudience(
  projectId: string,
  input: AudienceInput,
): Promise<ActionResult> {
  const p = audienceInput.safeParse(input);
  const organizationId = await orgId();
  if (!p.success || !id.safeParse(projectId).success || !organizationId)
    return fail("invalid_input");
  const { id: audienceId, ...values } = p.data;
  const supabase = await createClient();
  if (audienceId) {
    const { data, error } = await supabase
      .from("strategy_audiences")
      .update(values)
      .eq("id", audienceId)
      .eq("project_id", projectId)
      .select("id");
    if (!error && data.length === 0) return fail("stage_locked");
    return done(projectId, error);
  }
  const { error } = await supabase.from("strategy_audiences").insert({
    ...values,
    organization_id: organizationId,
    project_id: projectId,
  });
  return done(projectId, error);
}

export async function removeAudience(
  projectId: string,
  audienceId: string,
): Promise<ActionResult> {
  if (!id.safeParse(projectId).success || !id.safeParse(audienceId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_audiences")
    .delete()
    .eq("id", audienceId)
    .eq("project_id", projectId)
    .select("id");
  if (!error && data.length === 0) return fail("stage_locked");
  return done(projectId, error);
}
