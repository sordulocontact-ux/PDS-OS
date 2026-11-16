import { IconBoxArchive, IconMicrophone } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { ArtistListViews } from "@/components/catalog/artist-list-views";
import { ArtistsList } from "@/components/catalog/artists-list";
import { NewArtistButton } from "@/components/catalog/new-artist-button";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { LiveViewLink } from "@/components/archive/live-view-link";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { UrlFilters, type UrlFilterGroup } from "@/components/ui/url-filters";
import { archiveFilterGroup } from "@/lib/archive/filter";
import { isArchivedView } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { viewHref } from "@/lib/ui/view-href";
import {
  loadRosterProgress,
  rosterProgressOf,
} from "@/lib/catalog/artist-progress-load";
import { listArtists } from "@/lib/catalog/queries";
import { isArtistRelation, type ArtistListItem } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export const metadata = {
  title: `${fr.catalog.artists.title} · ${fr.app.name}`,
};

const TITLE_FILTERS = ["with", "without"] as const;
type TitleFilter = (typeof TITLE_FILTERS)[number];

const hasTitles = (artist: ArtistListItem, filter: TitleFilter | null) =>
  filter === null || artist.masterCount > 0 === (filter === "with");

export default async function ArtistsPage({
  searchParams,
}: PageProps<"/app/catalog/artists">) {
  const access = await requireApproved();
  const t = fr.catalog.artists;
  const canArchive = can(access, "archive_records");
  const params = await searchParams;
  // The archive is the director's: anyone else always sees live artists.
  const archived = canArchive && isArchivedView(params.view);
  // No filter = every artist ("Tous").
  const relation = isArtistRelation(params.relation) ? params.relation : null;
  const titles = TITLE_FILTERS.find((value) => value === params.titles) ?? null;
  // One read for the tab counts and the rows: the roster stays small. Where
  // the projects stand: every launched project's journeys, read once.
  const [{ artists: all, error }, roster] = await Promise.all([
    listArtists({ archived }),
    loadRosterProgress(),
  ]);
  // The tabs count what the filters keep.
  const filtered = all.filter((a) => hasTitles(a, titles));
  const counts = {
    all: filtered.length,
    signed: filtered.filter((a) => a.relation === "signed").length,
    collaboration: filtered.filter((a) => a.relation === "collaboration")
      .length,
  };
  const ofTab = relation ? all.filter((a) => a.relation === relation) : all;
  const artists = ofTab
    .filter((a) => hasTitles(a, titles))
    .map((a) => ({ ...a, ...rosterProgressOf(a.projectIds, roster) }));
  const canCreate = can(access, "manage_catalog") && !archived;
  // No row: the archive, the filter, the tab or the roster is empty.
  const empty =
    archived && !titles ? (
      <EmptyState
        icon={IconBoxArchive}
        title={fr.records.archivedEmpty.artist}
        body={fr.records.archivedEmptyBody}
        action={<LiveViewLink href={viewHref(routes.artists, { relation })} />}
      />
    ) : titles ? (
      <EmptyState
        icon={IconMicrophone}
        title={t.filtersEmpty}
        body={t.filtersEmptyBody}
      />
    ) : relation ? (
      <EmptyState
        icon={IconMicrophone}
        title={t.filteredEmpty[relation]}
        body={t.filteredEmptyBody}
        action={canCreate ? <NewArtistButton /> : null}
      />
    ) : (
      <EmptyState
        icon={IconMicrophone}
        title={t.emptyTitle}
        body={canCreate ? t.emptyBody : t.emptyBodyReadOnly}
        action={canCreate ? <NewArtistButton /> : null}
      />
    );

  const action = (
    <div className="flex flex-wrap gap-2">
      {/* The selections of artists, before a project (lot 4 of
          docs/pds-mic-plan.md): read by the whole team. */}
      <Link
        href={routes.artistSelections}
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        <ButtonRoll>{fr.artistSelections.open}</ButtonRoll>
      </Link>
      {canCreate && all.length > 0 && <NewArtistButton />}
    </div>
  );

  return (
    <SectionFrame
      title={t.title}
      description={t.subtitle}
      action={action}
      toolsAction
    >
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : (
        <>
          {roster.error && (
            <FormMessage kind="error">{t.progressError}</FormMessage>
          )}
          <ArtistListViews
            relation={relation}
            counts={counts}
            archived={archived}
            filters={{ titles }}
            pageAction={action}
          >
            {all.length === 0 ? (
              empty
            ) : (
              <ArtistsList
                artists={artists}
                // Within a relation filter, it goes without saying.
                showRelation={relation === null}
                rights={{
                  canEdit: can(access, "manage_catalog"),
                  canArchive,
                  archived,
                }}
                filters={
                  <UrlFilters
                    path={routes.artists}
                    params={{ relation }}
                    groups={[
                      ...filterGroups(ofTab, titles),
                      ...(canArchive ? [archiveFilterGroup(archived)] : []),
                    ]}
                  />
                }
                empty={empty}
              />
            )}
          </ArtistListViews>
        </>
      )}
    </SectionFrame>
  );
}

// Only the choices some artist of the tab holds.
function filterGroups(
  artists: ArtistListItem[],
  current: TitleFilter | null,
): UrlFilterGroup[] {
  const t = fr.catalog.artists.filters;
  return [
    {
      key: "titles",
      label: t.titlesLabel,
      allLabel: t.titlesAll,
      options: TITLE_FILTERS.filter((value) =>
        artists.some((a) => hasTitles(a, value)),
      ).map((value) => ({ value, label: t.titles[value] })),
      current,
    },
  ];
}
