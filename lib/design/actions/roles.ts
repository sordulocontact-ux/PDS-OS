"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, type DesignResult } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Delegations and governance of a Conception (MKT-C2-08). Rights are the
// database's (delegate_design_role, revoke_design_delegation,
// set_design_self_approval): these validate the input only.

const fail = (): DesignResult => ({
  ok: false,
  error: fr.conception.errors.invalid,
});

const delegationInput = z.object({
  projectId: z.uuid(),
  scope: z.enum(["direction", "sheet"]),
  sheetId: z.uuid().nullable(),
  role: z.enum(["responsible", "validator"]),
  fromId: z.uuid(),
  toId: z.uuid(),
  reason: z.string().trim().min(1).max(1000),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
});

/** The owner hands a role on a scope to another member, for a while. */
export async function delegateDesignRole(
  input: z.input<typeof delegationInput>,
): Promise<DesignResult> {
  const p = delegationInput.safeParse(input);
  if (!p.success) return fail();
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delegate_design_role", {
    p_project_id: p.data.projectId,
    p_scope: p.data.scope,
    p_sheet_id: p.data.sheetId,
    p_role: p.data.role,
    p_from: p.data.fromId,
    p_to: p.data.toId,
    p_reason: p.data.reason,
    p_starts: p.data.startsOn,
    p_ends: p.data.endsOn,
  });
  return designDone(p.data.projectId, error, "delegateDesignRole");
}

export async function revokeDesignDelegation(
  projectId: string,
  delegationId: string,
): Promise<DesignResult> {
  if (!z.uuid().safeParse(delegationId).success) return fail();
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_design_delegation", {
    p_delegation_id: delegationId,
  });
  return designDone(projectId, error, "revokeDesignDelegation");
}

/** A validator lets (or no longer lets) people approve what they submitted. */
export async function setSelfApproval(
  projectId: string,
  allow: boolean,
  reason: string,
): Promise<DesignResult> {
  const p = z
    .object({ projectId: z.uuid(), reason: z.string().trim().min(1).max(1000) })
    .safeParse({ projectId, reason });
  if (!p.success) return fail();
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_design_self_approval", {
    p_project_id: p.data.projectId,
    p_allow: allow,
    p_reason: p.data.reason,
  });
  return designDone(p.data.projectId, error, "setSelfApproval");
}
