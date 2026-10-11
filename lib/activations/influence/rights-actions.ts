"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const date = z.union([z.iso.date(), z.literal("")]);

const rightsSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  targetId: z.uuid(),
  // The proposed block edited, or null for a new block (a new version once
  // the current one is decided).
  rightsId: z.uuid().nullable(),
  kind: z.enum(["organic", "ads"]),
  platforms: z.array(z.string().trim().min(1).max(40)).max(12),
  supports: z.string().max(500),
  territory: z.string().max(200),
  startsOn: date,
  endsOn: date,
  remuneration: z.enum(["included", "additional"]),
  remunerationNote: z.string().max(500),
  modificationAllowed: z.boolean(),
  creditRequired: z.boolean(),
  restrictions: z.string().max(2000),
});

/** One rights block, organic or advertising : edited while proposed, else a
 * new version that replaces it (the database keeps the old one). */
export async function saveRights(
  input: z.input<typeof rightsSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = rightsSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const values = {
    platforms: v.platforms,
    supports: textOrNull(v.supports),
    territory: textOrNull(v.territory),
    starts_on: textOrNull(v.startsOn),
    ends_on: textOrNull(v.endsOn),
    remuneration: v.remuneration,
    remuneration_note: textOrNull(v.remunerationNote),
    modification_allowed: v.modificationAllowed,
    credit_required: v.creditRequired,
    restrictions: textOrNull(v.restrictions),
  };
  const supabase = await createClient();
  const { error } = v.rightsId
    ? await supabase
        .from("influence_rights")
        .update(values)
        .eq("id", v.rightsId)
    : await supabase.from("influence_rights").insert({
        ...values,
        target_id: v.targetId,
        kind: v.kind,
        organization_id: access.organizationId ?? "",
        project_id: v.projectId,
        activation_id: v.activationId,
      });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const decideSchema = z.object({
  projectId: z.uuid(),
  rightsId: z.uuid(),
  decision: z.enum(["accepted", "refused", "revoked"]),
  note: z.string().max(1000),
});

/** Accepted (with how it was obtained), refused or revoked : each block on
 * its own ; a reason for refusing or revoking. */
export async function decideRights(
  input: z.input<typeof decideSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_influence_rights", {
    p_rights_id: v.rightsId,
    p_decision: v.decision,
    p_note: v.note,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}
