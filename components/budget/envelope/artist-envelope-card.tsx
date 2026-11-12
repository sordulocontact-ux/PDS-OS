import { EnvelopeSummary } from "@/components/budget/envelope/envelope-summary";
import { PageSection } from "@/components/shell/page-section";
import { ViewLink } from "@/components/ui/view-link";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { loadArtistBudget } from "@/lib/budget/envelope-queries";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";

/**
 * An artist's envelope above Dépenses filtered on that artist (UX test of
 * 12/11/2026: the list said nothing of what remains): the four figures and
 * a link to its budget under « Business ». Nothing without an envelope.
 */
export async function ArtistEnvelopeCard({
  artistId,
  artistName,
}: {
  artistId: string;
  artistName: string;
}) {
  const { current } = await loadArtistBudget(artistId);
  if (!current) return null;
  const t = artistBudget.expensesCard;
  return (
    <PageSection
      card
      id="enveloppe"
      title={t.title(artistName)}
      action={
        <ViewLink
          href={routes.artistBudget(artistId)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t.open}
        </ViewLink>
      }
    >
      <EnvelopeSummary amountCents={current.amountCents} view={current.view} />
    </PageSection>
  );
}
