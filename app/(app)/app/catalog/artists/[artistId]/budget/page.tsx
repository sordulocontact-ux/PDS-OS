import { IconMoneyBillCoin } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { BudgetLines } from "@/components/budget/budget-lines";
import { EnvelopeButton } from "@/components/budget/envelope/envelope-button";
import { EnvelopeHistory } from "@/components/budget/envelope/envelope-history";
import { EnvelopePosts } from "@/components/budget/envelope/envelope-posts";
import { EnvelopeSummary } from "@/components/budget/envelope/envelope-summary";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { loadArtistBudget } from "@/lib/budget/envelope-queries";
import { getArtist } from "@/lib/catalog/artist-queries";
import { formatDay } from "@/lib/utils/day";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: artistBudget.tab };

// The Budget of an artist (BUD 2, Ibé 11/11/2026): its envelope by poste
// (planned, spent, rest), its spends (direct ones written here, its
// projects' read under their own rule), the history of the envelopes. For
// whoever reads the artists' budgets; the direction alone sets the envelope.
export default async function ArtistBudgetPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/budget">) {
  const { artistId } = await params;
  const [access, artist] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
  ]);
  if (!artist || !can(access, "read_artist_budgets")) notFound();
  const data = await loadArtistBudget(artist.id);
  const t = artistBudget;
  const manages = can(access, "manage_artist_budgets");
  const current = data.current;

  return (
    <>
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {current ? (
        <PageSection
          id="artist-budget-envelope"
          title={t.envelope.title}
          description={t.envelope.period(
            formatDay(current.startsOn),
            current.endsOn && formatDay(current.endsOn),
          )}
          action={
            manages ? (
              <div className="flex flex-wrap gap-2">
                <EnvelopeButton
                  artistId={artist.id}
                  current={current}
                  mode="edit"
                />
                <EnvelopeButton
                  artistId={artist.id}
                  current={current}
                  mode="reopen"
                />
              </div>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-4">
            <EnvelopeSummary
              amountCents={current.amountCents}
              view={current.view}
            />
            {current.view.rows.length > 0 && (
              <EnvelopePosts rows={current.view.rows} />
            )}
          </div>
        </PageSection>
      ) : (
        <EmptyState
          icon={IconMoneyBillCoin}
          title={t.envelope.emptyTitle}
          body={manages ? t.envelope.emptyBody : t.envelope.emptyBodyReader}
          action={
            manages ? (
              <EnvelopeButton artistId={artist.id} current={null} mode="open" />
            ) : undefined
          }
        />
      )}
      <PageSection id="artist-budget-lines" title={t.lines.title}>
        <BudgetLines
          target={{ kind: "artist", id: artist.id }}
          lines={data.lines}
          organizationId={access.organizationId}
          canEdit
        />
      </PageSection>
      <EnvelopeHistory history={data.history} events={data.events} />
    </>
  );
}
