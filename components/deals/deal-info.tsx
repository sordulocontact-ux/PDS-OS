import { AssignDealButton } from "@/components/deals/assign-deal-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { routes } from "@/lib/auth/redirects";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";

const fr = { deals };

/**
 * What a deal is about and who negotiates it (BIZ 4): its kind, project
 * (a link only for whoever sees the project), title, artist, the
 * participation and its contract (read on the participation, never copied
 * on the deal), the negotiator (« Changer » for who assigns).
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
  const contract = deal.participationId
    ? deal.contractStatus === "signed"
      ? t.contractSigned
      : deal.contractStatus
        ? t.contractOpen
        : t.contractNone
    : null;
  return (
    <FactRows>
      <FactRow label={t.kind} value={fr.deals.kinds[deal.kind]} />
      {deal.projectTitle && (
        <FactRow
          label={t.project}
          value={deal.projectTitle}
          href={
            deal.projectVisible && deal.projectId
              ? routes.project(deal.projectId)
              : null
          }
          hrefLabel={deal.projectTitle}
        />
      )}
      {title && <FactRow label={t.title} value={title} />}
      {deal.artistName && deal.artistId && (
        <FactRow
          label={t.artist}
          value={deal.artistName}
          href={routes.artist(deal.artistId)}
          hrefLabel={deal.artistName}
        />
      )}
      {deal.participationStatus && (
        <FactRow
          label={t.participation}
          value={
            fr.deals.page.participationStatuses[deal.participationStatus] ??
            deal.participationStatus
          }
        />
      )}
      {contract && <FactRow label={t.contract} value={contract} />}
      <FactRow
        label={t.assignee}
        value={deal.assignee?.name ?? t.unassigned}
        side={
          deal.canAssign && negotiators ? (
            <AssignDealButton
              dealId={deal.id}
              current={deal.assignee?.id ?? null}
              negotiators={negotiators}
            />
          ) : null
        }
      />
    </FactRows>
  );
}
