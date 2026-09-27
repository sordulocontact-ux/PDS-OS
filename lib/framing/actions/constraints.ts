"use server";

import { z } from "zod";

import { REVIEW, done, id, orgId, text } from "@/lib/framing/actions/shared";
import { CONSTRAINT_TYPES } from "@/lib/framing/constraints";
import { fail, type ActionResult } from "@/lib/framing/result";
import { createClient } from "@/lib/supabase/server";

/** A "Cadre & contraintes" line typed by hand: confirmed, since a person wrote it. */
export async function addConstraint(
  projectId: string,
  type: string,
  value: string,
): Promise<ActionResult> {
  const p = z
    .object({ projectId: id, type: z.enum(CONSTRAINT_TYPES), value: text(500) })
    .safeParse({ projectId, type, value });
  const organizationId = await orgId();
  if (!p.success || !organizationId) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("framing_constraints").insert({
    organization_id: organizationId,
    project_id: projectId,
    type: p.data.type,
    text: p.data.value,
  });
  return done(projectId, error);
}

const patch = z
  .object({
    type: z.enum(CONSTRAINT_TYPES).optional(),
    text: text(500).optional(),
    review_status: z.enum(REVIEW).optional(),
  })
  .refine((v) => Object.keys(v).length > 0);

/** Retypes, rewrites, confirms or removes (rejects) one line. */
export async function updateConstraint(
  projectId: string,
  constraintId: string,
  changes: z.input<typeof patch>,
): Promise<ActionResult> {
  const p = patch.safeParse(changes);
  if (
    !p.success ||
    !id.safeParse(constraintId).success ||
    !id.safeParse(projectId).success
  )
    return fail("invalid_input");
  if (!(await orgId())) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase
    .from("framing_constraints")
    .update(p.data)
    .eq("id", constraintId)
    .eq("project_id", projectId);
  return done(projectId, error);
}
