import type { PortalCardItem } from "@/components/portal/portal-sections";
import { StatusBadge } from "@/components/ui/status-badge";
import { shortStamp } from "@/lib/calls/prep/dates";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";

import { LinkDirectorForm } from "./link-director-form";

const t = fr.productionLink.director;
const TONE = {
  proposed: "info",
  retained: "success",
  declined: "neutral",
} as const;

/**
 * « Proposer un réalisateur » on the company's link (proto portalDirector):
 * its proposals (name, showreel, why, when) with their state, and the form
 * — « Proposer un autre réalisateur » once one is sent; done once PDS
 * retained one.
 */
export function linkDirectorCard(
  token: string,
  j: LinkJourney,
  company: string,
): PortalCardItem | null {
  if (!j.roles.includes("company") || j.organization !== "external")
    return null;
  const list = j.directorProposals;
  const retained = list.some((d) => d.status === "retained");
  return {
    id: "ps-director",
    title: t.title,
    state: retained ? "done" : list.length > 0 ? "waiting" : "todo",
    order: 8,
    action: retained ? null : { label: t.action },
    body: (
      <>
        {list.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t.sent}</h3>
            <ul className="flex flex-col gap-2">
              {list.map((d) => (
                <li
                  key={`${d.name}-${d.proposedAt}`}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
                    <span>
                      <b className="font-semibold">{d.name}</b> · {d.reelUrl}
                    </span>
                    {d.note && <span>« {d.note} »</span>}
                    <span className="text-caption text-[color:var(--text-tertiary)]">
                      {t.by(company, shortStamp(d.proposedAt))}
                    </span>
                  </span>
                  <StatusBadge size="sm" tone={TONE[d.status]}>
                    {t.status[d.status]}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </section>
        )}
        {!retained && (
          <LinkDirectorForm token={token} again={list.length > 0} />
        )}
      </>
    ),
  };
}
