import type { PortalCardItem } from "@/components/portal/portal-sections";
import { PublicSplit } from "@/components/legal/splits/public-split";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { portal } from "@/lib/i18n/fr/portal";
import type { PublicSplit as PublicSplitData } from "@/lib/legal/splits/public";

const fr = { legalSplits, portal };

const t = fr.legalSplits.public;

/**
 * A split confirmation as a card of a private page (ticket Juridique 04):
 * to confirm or dispute while open; a dispute waits for PDS; a
 * confirmation is done. On its own link (/s) and on the person's page (/c).
 */
export function splitPortalCard({
  linkKey,
  split,
  project,
}: {
  linkKey: string;
  split: Exclude<PublicSplitData, { state: "expired" | "revoked" }>;
  // The project's title, once the split's own content is no longer shown.
  project: string;
}): PortalCardItem {
  const open = split.state === "open";
  return {
    id: "ps-split",
    title: fr.portal.split.title(
      split.state === "open" ? split.content.title : project,
    ),
    state: open ? "todo" : split.state === "disputed" ? "waiting" : "done",
    action: { label: fr.portal.split.action },
    order: 1,
    workflow: "legal",
    body:
      split.state === "open" ? (
        <>
          <p className="text-muted-foreground">
            {t.intro(split.person, split.content.title, split.project)}
          </p>
          <PublicSplit token={linkKey} split={split} />
        </>
      ) : (
        <p className="font-medium">{t.states[split.state]}</p>
      ),
  };
}
