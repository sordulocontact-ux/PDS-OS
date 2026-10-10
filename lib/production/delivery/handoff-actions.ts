"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { deliveryFailure } from "@/lib/production/delivery/result";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  formats: z.array(z.string().trim().min(1).max(40)).max(20),
  constraints: z.string().trim().max(2000),
});

/**
 * « Confirmer la transmission »: the proposal prepared by code (version,
 * formats, date) is recorded only now, by the owner, once delivered. The
 * database references the delivered version and its date itself; nothing
 * is published (transmit_to_activations).
 */
export async function transmitToActivations(
  input: z.input<typeof schema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const { projectId, sheetId, formats, constraints } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("transmit_to_activations", {
    p_sheet_id: sheetId,
    p_formats: [...new Set(formats)],
    p_constraints: constraints,
  });
  return error ? deliveryFailure(error) : prepDone(projectId);
}
