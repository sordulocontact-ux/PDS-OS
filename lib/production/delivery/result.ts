import "server-only";

import { fr } from "@/lib/i18n/fr";
import { prepFailure, type PrepResult } from "@/lib/production/prep-result";

const e = fr.productionDelivery.errors;
const c = fr.productionClosure.errors;

/** Maps a database refusal of the delivery tab to its message; the rest as
 * the preparation does. */
export function deliveryFailure(error: {
  code?: string;
  message?: string;
}): PrepResult {
  const message = error.message ?? "";
  if (message.includes("not_delivered"))
    return { ok: false, error: e.notDelivered };
  if (message.includes("exports_not_conforming"))
    return { ok: false, error: c.exportsNotConforming };
  if (message.includes("person_not_member"))
    return { ok: false, error: c.personNotMember };
  if (message.includes("not_handed_off"))
    return { ok: false, error: c.notHandedOff };
  if (message.includes("closing_blocked"))
    return { ok: false, error: c.closingBlocked };
  if (message.includes("export_not_deposited"))
    return { ok: false, error: c.notDeposited };
  if (message.includes("production_export_check_items_note_check"))
    return { ok: false, error: fr.productionClosure.points.noteRequired };
  if (message.includes("production_export_checks_not_ok_check"))
    return { ok: false, error: e.noteRequired };
  if (message.includes("production_export_checks_url_check"))
    return { ok: false, error: e.url };
  if (message.includes("production_export_checks_label_check"))
    return { ok: false, error: e.label };
  return prepFailure(error);
}
