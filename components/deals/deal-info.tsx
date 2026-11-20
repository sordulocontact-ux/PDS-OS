import type { ReactNode } from "react";

import { AssignDealButton } from "@/components/deals/assign-deal-button";
import { FactCard, FactCards } from "@/components/ui/fact-card";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";

const fr = { deals };

/** A value that opens its page. */
function Linked({ href, children }: { href: string; children: ReactNode }) {
  return (
    <ViewLink href={href} className="underline-offset-2 hover:underline">
      {children}
    </ViewLink>
  );
}

/**
 * What a deal is about and who negotiates it (BIZ 4), one card each (Sacha
 * 20/11/2026, proto « Fiche d'un deal » v2): its kind, the label or brand it
 * is negotiated with (a link to the Réseau), project (a link only for
 * whoever sees the project), title, artist, the participation, the
 * negotiator (« Changer » for who assigns). The contract has its own
 * section (BIZ 7, DealContract).
 */
export function DealInfo({
  deal,
  negotiators,
}: {
  deal: Deal;
  negotiators: Record<string, string> | null;
}) {
  const t = fr.deals.page.info;
  const title =
    deal.titleLabel ??
    (deal.titlePosition !== null
      ? fr.deals.name.title(deal.titlePosition)
      : null);
  return (
    <FactCards>
      <FactCard label={t.kind} value={fr.deals.kinds[deal.kind]} text />
      {deal.counterpartName && deal.counterpartId && (
        <FactCard
          label={t.counterpart[deal.kind] ?? t.counterpart.label}
          value={
            <Linked href={routes.networkContact(deal.counterpartId)}>
              {deal.counterpartName}
            </Linked>
          }
          text
        />
      )}
      {deal.projectTitle && (
        <FactCard
          label={t.project}
          value={
            deal.projectVisible && deal.projectId ? (
              <Linked href={routes.project(deal.projectId)}>
                {deal.projectTitle}
              </Linked>
            ) : (
              deal.projectTitle
            )
          }
          text
        />
      )}
      {title && <FactCard label={t.title} value={title} text />}
      {deal.artistName && deal.artistId && (
        <FactCard
          label={t.artist}
          value={
            <Linked href={routes.artist(deal.artistId)}>
              {deal.artistName}
            </Linked>
          }
          text
        />
      )}
      {deal.participationStatus && (
        <FactCard
          label={t.participation}
          value={
            fr.deals.page.participationStatuses[deal.participationStatus] ??
            deal.participationStatus
          }
          text
        />
      )}
      <FactCard
        label={t.assignee}
        value={deal.assignee?.name ?? t.unassigned}
        text
        action={
          deal.canAssign && negotiators ? (
            <AssignDealButton
              dealId={deal.id}
              current={deal.assignee?.id ?? null}
              negotiators={negotiators}
            />
          ) : null
        }
      />
    </FactCards>
  );
}
