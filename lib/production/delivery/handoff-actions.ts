"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { deliveryFailure } from "@/lib/production/delivery/result";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  formats: z.array(z.string().trim().min(1).max(40)).max(20),
  constraints: z.string().trim().max(2000),
  recipientPersonId: z.uuid(),
});

/**
 * « Confirmer la transmission »: the proposal prepared by code (version,
 * formats, date) is recorded only now, by the owner, once delivered. The
 * database refuses it unless every expected file is validated and
 * conforming, references the delivered version, the files and what is
 * expected of each, and tells the person in charge of Activations
 * (transmit_production_to_activations, PROD-039). Nothing is published.
 */
export async function transmitToActivations(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.path[0] === "recipientPersonId"
          ? fr.productionClosure.handoff.recipientRequired
          : fr.productionPrep.errors.invalid,
    };
  const { projectId, sheetId, formats, constraints, recipientPersonId } =
    parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("transmit_production_to_activations", {
    p_sheet_id: sheetId,
    p_formats: [...new Set(formats)],
    p_constraints: constraints,
    p_recipient_person_id: recipientPersonId,
  });
  if (error) return deliveryFailure(error);
  await schedulePendingPushes();
  return prepDone(projectId);
}

const closeSchema = z.object({ projectId: z.uuid(), sheetId: z.uuid() });

/** « Clôturer la production » (PROD-040): refused by the database while
 * not transmitted, equipment is still out or an incident blocks it; who
 * and when are kept. */
export async function closeProductionSheet(
  input: z.input<typeof closeSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_production_sheet", {
    p_sheet_id: parsed.data.sheetId,
  });
  return error ? deliveryFailure(error) : prepDone(parsed.data.projectId);
}
