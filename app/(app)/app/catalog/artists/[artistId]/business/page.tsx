import { notFound } from "next/navigation";

import { ArtistBudgetSections } from "@/components/budget/artist-budget-sections";
import { DealsTable } from "@/components/deals/deals-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import { loadArtistDeals } from "@/lib/deals/artist-deals";
import { artistBusiness } from "@/lib/i18n/fr/artist-business";
import { todayInParis } from "@/lib/insights/dates";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: artistBusiness.tab };

// « Business » of an artist (BIZ 10): its deals, then its budget, in one tab
// (an artist's page already has more tabs than the rule's six: Budget and
// Deals share this one rather than adding a tenth). Each section under its
// own right: the deals the reader may see (can_read_deal), the budget for
// whoever reads the artists' budgets. Not found when neither.
export default async function ArtistBusinessPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/business">) {
  const { artistId } = await params;
  const [access, artist] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
  ]);
  if (!artist) notFound();
  const today = todayInParis();
  const readsBudget = can(access, "read_artist_budgets");
  const readsDeals =
    can(access, "validate") ||
    can(access, "negotiate") ||
    can(access, "pilot_projects");
  const deals = readsDeals
    ? await loadArtistDeals(access, artist.id, today)
    : null;
  if (!readsBudget && !deals?.count) notFound();
  const t = artistBusiness;

  return (
    <>
      {deals && (deals.count > 0 || readsBudget) && (
        <PageSection id="deals" title={t.deals}>
          {deals.count === 0 ? (
            <EmptyNote>{t.noDeal}</EmptyNote>
          ) : (
            <DealsTable
              groups={deals.groups.map((g) => ({
                key: g.key,
                label: t.groups[g.key],
                rows: g.rows,
              }))}
              contracts={deals.contracts}
              today={today}
            />
          )}
        </PageSection>
      )}
      {readsBudget && (
        <ArtistBudgetSections access={access} artistId={artist.id} />
      )}
    </>
  );
}
