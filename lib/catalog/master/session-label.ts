import type { MasterSession } from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { formatShortDate } from "@/lib/release/format";

const fr = { masterPage };

/** "Enregistrement · Studio Ferber · 12 sept. 2026", to name a session. */
export function sessionLabel(
  session: Pick<MasterSession, "kind" | "studio" | "date">,
): string {
  return [
    fr.masterPage.sessions.kinds[session.kind],
    session.studio,
    session.date ? formatShortDate(session.date) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
