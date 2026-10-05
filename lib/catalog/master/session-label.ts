import type { MasterSession } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";

/** "Enregistrement · Studio Ferber · 12 sept. 2026", to name a session. */
export function sessionLabel(session: MasterSession): string {
  return [
    fr.masterPage.sessions.kinds[session.kind],
    session.studio,
    session.date ? formatShortDate(session.date) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
