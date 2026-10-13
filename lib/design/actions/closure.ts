"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  designError,
  refreshConception,
  type DesignResult,
} from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// The refusals of pass_to_production / reopen_design, said for them.
function closureDone(
  projectId: string,
  error: { code?: string; message: string } | null,
  where: string,
): DesignResult {
  if (!error) {
    refreshConception(projectId);
    return { ok: true };
  }
  console.error(`${where}:`, error.code, error.message);
  const c = fr.conceptionClosure.errors;
  const codes: Array<[string, string]> = [
    ["conception_not_validated", c.notValidated],
    ["brief_required", c.briefRequired],
    ["production_closed", c.productionClosed],
    ["exclusion_reason_required", c.reasonRequired],
    ["forbidden", c.directionOnly],
    ["invalid_transition", c.invalidTransition],
  ];
  const known = codes.find(([code]) => error.message.includes(code));
  return { ok: false, error: known ? known[1] : designError(error) };
}

const exclusions = z
  .array(
    z.object({
      deliverableId: z.uuid(),
      reason: z.string().trim().min(1).max(1000),
    }),
  )
  .max(200);

/**
 * « Passer en Production » (MKT-C2-13): the plan confirmed, with the
 * deliverables excluded for now and their reasons. The database hands over,
 * creates the reserves' tasks and starts the stage, once
 * (pass_to_production).
 */
export async function passToProduction(
  projectId: string,
  excluded: Array<{ deliverableId: string; reason: string }>,
): Promise<DesignResult> {
  const parsed = exclusions.safeParse(excluded);
  if (!z.uuid().safeParse(projectId).success || !parsed.success)
    return { ok: false, error: fr.conceptionClosure.errors.reasonRequired };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("pass_to_production", {
    p_project_id: projectId,
    p_exclusions: parsed.data.map((e) => ({
      deliverable_id: e.deliverableId,
      reason: e.reason,
    })),
  });
  return closureDone(projectId, error, "passToProduction");
}

/** « Rouvrir la Conception »: the direction, with a reason (reopen_design). */
export async function reopenDesign(
  projectId: string,
  reason: string,
): Promise<DesignResult> {
  if (!z.uuid().safeParse(projectId).success)
    return { ok: false, error: fr.conception.errors.generic };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_design", {
    p_project_id: projectId,
    p_reason: reason,
  });
  return closureDone(projectId, error, "reopenDesign");
}
