import "server-only";

import { fr } from "@/lib/i18n/fr";
import { prepFailure, type PrepResult } from "@/lib/production/prep-result";

const e = fr.productionShoot.errors;

/** Maps a refusal of the shoot's writes to its message; the rest of
 * Production's refusals as the preparation's. */
export function shootFailure(error: {
  code?: string;
  message?: string;
  // The missing contracts, named by the database (lot 12).
  details?: string | null;
}): PrepResult {
  const message = error.message ?? "";
  if (message.includes("not_ready")) return { ok: false, error: e.notReady };
  // A collective (lot 12): a confirmed participation of the titles shot has
  // neither its contract signed nor an open waiver of the shoot.
  if (message.includes("contract_missing"))
    return {
      ok: false,
      error: fr.participationWaivers.refused.shoot(
        error.details || fr.participationWaivers.refused.someone,
      ),
    };
  if (message.includes("missing_sequences_required"))
    return { ok: false, error: e.missingSequences };
  if (message.includes("shoot_not_ended"))
    return { ok: false, error: e.notEnded };
  if (
    message.includes("person_not_member") ||
    message.includes("contact_not_found") ||
    message.includes("one_holder")
  )
    return { ok: false, error: e.holder };
  if (message.includes("production_equipment_incident_check"))
    return { ok: false, error: e.incidentNote };
  if (message.includes("shoot_not_found"))
    return { ok: false, error: fr.productionPrep.errors.notFound };
  return prepFailure(error);
}

export const invalidInput: PrepResult = {
  ok: false,
  error: fr.productionPrep.errors.invalid,
};
