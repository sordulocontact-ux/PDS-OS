import { IconMoneyBillCoin } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { BudgetLines } from "@/components/budget/budget-lines";
import { EnvelopeButton } from "@/components/budget/envelope/envelope-button";
import { ClosedEnvelopes } from "@/components/budget/envelope/closed-envelopes";
import { EnvelopePosts } from "@/components/budget/envelope/envelope-posts";
import { EnvelopeSummary } from "@/components/budget/envelope/envelope-summary";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { can, type Access } from "@/lib/auth/access";
import { loadArtistBudget } from "@/lib/budget/envelope-queries";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { formatDay } from "@/lib/utils/day";

/**
 * The Budget of an artist (BUD 2, Ibé 11/11/2026): its envelope by poste
 * (planned, spent, rest), its spends (direct ones written here, its
 * projects' read under their own rule), the closed envelopes. For
 * whoever reads the artists' budgets; the direction alone sets the
 * envelope. Under « Business » of the artist's page, after the deals
 * (BIZ 10).
 */
export async function ArtistBudgetSections({
  access,
  artistId,
}: {
  access: Access;
  artistId: string;
}) {
  const data = await loadArtistBudget(artistId);
  const t = artistBudget;
  const manages = can(access, "manage_artist_budgets");
  const current = data.current;

  return (
    <>
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {current ? (
        <PageSection
          id="budget"
          title={t.envelope.title}
          description={t.envelope.period(
            formatDay(current.startsOn),
            current.endsOn && formatDay(current.endsOn),
          )}
          action={
            manages ? (
              <div className="flex flex-wrap gap-2">
                <EnvelopeButton
                  artistId={artistId}
                  current={current}
                  mode="edit"
                />
                <EnvelopeButton
                  artistId={artistId}
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
        <div id="budget">
          <EmptyState
            icon={IconMoneyBillCoin}
            title={t.envelope.emptyTitle}
            body={manages ? t.envelope.emptyBody : t.envelope.emptyBodyReader}
            action={
              manages ? (
                <EnvelopeButton
                  artistId={artistId}
                  current={null}
                  mode="open"
                />
              ) : undefined
            }
          />
        </div>
      )}
      <PageSection id="artist-budget-lines" title={t.lines.title}>
        <BudgetLines
          target={{ kind: "artist", id: artistId }}
          lines={data.lines}
          organizationId={access.organizationId}
          canEdit
        />
      </PageSection>
      <ClosedEnvelopes closed={data.closed} />
    </>
  );
}
