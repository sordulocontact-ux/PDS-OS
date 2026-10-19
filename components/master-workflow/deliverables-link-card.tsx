import { DeliverVersion } from "@/components/master-workflow/deliver-version";
import type { PortalCardItem } from "@/components/portal/portal-sections";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import type { LinkDeliverable } from "@/lib/master-workflow/deliverables-public";
import { formatShortInstant } from "@/lib/utils/day";

const t = fr.masterFinal.link;
const labels: Record<string, string> = fr.masterWorkflow.brief.deliverables;

/** « Autres livrables » on the mastering engineer's link (proto): each
 * deliverable the Brief expects, received (« Envoyé le … ») or to deposit. */
export function deliverablesPortalCard({
  linkKey,
  items,
}: {
  linkKey: string;
  items: LinkDeliverable[];
}): PortalCardItem | null {
  if (items.length === 0) return null;
  const missing = items.filter((i) => !i.fileName);
  const several = new Set(items.map((i) => i.masterId)).size > 1;
  const label = (i: LinkDeliverable) =>
    `${labels[i.deliverable] ?? i.deliverable}${several ? ` · « ${i.title} »` : ""}`;
  return {
    id: "ps-deliverables",
    title: t.title,
    state: missing.length ? "todo" : "done",
    badge: missing.length ? undefined : t.states.done,
    action: missing.length
      ? { label: t.todo(missing.length), due: null }
      : null,
    order: 9,
    workflow: "master",
    body: (
      <div className="flex flex-col gap-4">
        {items.some((i) => i.fileName) && (
          <FactRows>
            {items
              .filter((i) => i.fileName)
              .map((i) => (
                <FactRow
                  key={`${i.masterId}-${i.deliverable}`}
                  label={label(i)}
                  value={
                    <b className="font-semibold break-all">{i.fileName}</b>
                  }
                  source={i.at ? t.sent(formatShortInstant(i.at)) : null}
                  state={{ tone: "success", label: fr.masterFinal.received }}
                />
              ))}
          </FactRows>
        )}
        {missing.map((i) => (
          <DeliverVersion
            key={`${i.masterId}-${i.deliverable}`}
            token={linkKey}
            masterId={i.masterId}
            role="mastering"
            deliverable={{ key: i.deliverable, label: label(i) }}
          />
        ))}
      </div>
    ),
  };
}
