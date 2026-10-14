"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

const e = fr.productionDirection.errors;

function failure(error: { message?: string; code?: string }): PrepResult {
  const key = (Object.keys(e) as (keyof typeof e)[]).find((k) =>
    error.message?.includes(k),
  );
  return key ? { ok: false, error: e[key] } : prepFailure(error);
}

const submitSchema = z.object({ projectId: z.uuid(), sheetId: z.uuid() });

/** « Envoyer la proposition » (whoever writes the director's brief, or
 * organises the production). */
export async function submitDirection(
  input: z.input<typeof submitSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_production_direction", {
    p_sheet_id: parsed.data.sheetId,
  });
  if (error) return failure(error);
  await schedulePendingPushes();
  return prepDone(parsed.data.projectId);
}

const decideSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  approve: z.boolean(),
  comment: z.string().trim().max(1000),
});

/** « Valider » / « Demander des modifications » (the owner or a creative
 * director of the project). */
export async function decideDirection(
  input: z.input<typeof decideSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  if (!p.approve && !p.comment) return { ok: false, error: e.reason_required };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_production_direction", {
    p_sheet_id: p.sheetId,
    p_approve: p.approve,
    p_comment: p.comment || null,
  });
  if (error) return failure(error);
  await schedulePendingPushes();
  return prepDone(p.projectId);
}
