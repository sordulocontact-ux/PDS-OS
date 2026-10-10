import "server-only";

import { fr } from "@/lib/i18n/fr";
import { prepFailure, type PrepResult } from "@/lib/production/prep-result";

const e = fr.productionDelivery.errors;

/** Maps a database refusal of the delivery tab to its message; the rest as
 * the preparation does. */
export function deliveryFailure(error: {
  code?: string;
  message?: string;
}): PrepResult {
  const message = error.message ?? "";
  if (message.includes("not_delivered"))
    return { ok: false, error: e.notDelivered };
  if (message.includes("production_export_checks_not_ok_check"))
    return { ok: false, error: e.noteRequired };
  if (message.includes("production_export_checks_url_check"))
    return { ok: false, error: e.url };
  if (message.includes("production_export_checks_label_check"))
    return { ok: false, error: e.label };
  return prepFailure(error);
}
