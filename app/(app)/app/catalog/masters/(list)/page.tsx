import { IconBoxArchive, IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { MastersList } from "@/components/catalog/masters-list";
import { LiveViewLink } from "@/components/archive/live-view-link";
import { TitleListViews } from "@/components/catalog/title/title-list-views";
import { IconDisc } from "@/components/icons";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { UrlFilters, type UrlFilterGroup } from "@/components/ui/url-filters";
import { archiveFilterGroup } from "@/lib/archive/filter";
import { isArchivedView } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { viewHref } from "@/lib/ui/view-href";
import { listMasterCoverThumbs } from "@/lib/catalog/covers";
import { listMasters } from "@/lib/catalog/queries";
import {
  AUDIO_FILTERS,
  audioFilterOf,
  countTitleViews,
  inTitleView,
  matchesTitleFilters,
  titleViewOf,
  titleViewParam,
  type TitleFilters,
} from "@/lib/catalog/title-views";
import type { MasterRow } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { filterParam, optionsByName } from "@/lib/ui/filter-options";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.catalog.masters.title} · ${fr.app.name}`,
};

// Catalogue ("masters" in the code, retours Catalogue 01, 02 et 04): tabs by
// where the song stands (Tous, En création, En production, Finalisés), the
// audio step, artist and project as combinable filters, all in the URL
// (docs/ARCHITECTURE.md § 2 septies).
export default async function MastersPage({
  searchParams,
}: PageProps<"/app/catalog/masters">) {
  const access = await requireApproved();
  const t = fr.catalog.masters;
  const canArchive = can(access, "archive_records");
  const params = await searchParams;
  // The archive is the director's: anyone else always sees live titles.
  const archived = canArchive && isArchivedView(params.view);
  const view = titleViewOf(params.state);
  const filters: TitleFilters = {
    audio: audioFilterOf(params.audio),
    artist: filterParam(params.artist),
    project: filterParam(params.project),
  };
  // One read for the tab counts and the rows: the catalog stays small. The
  // covers are read beside it.
  const [{ masters: all, error }, covers, { masters: demoRows }] =
    await allInOrder([
      listMasters({ archived }),
      listMasterCoverThumbs(),
      listMasters({ demos: true }),
    ]);
  // The tabs count what the filters keep; the filters offer what the tab
  // holds.
  const filtered = all.filter((master) => matchesTitleFilters(master, filters));
  const ofView = all.filter((master) => inTitleView(master, view));
  const masters = filtered.filter((master) => inTitleView(master, view));
  const filtering = Object.values(filters).some((value) => value !== null);
  const newMaster =
    can(access, "manage_catalog") && !archived ? (
      <Link href={routes.mastersNew} className={buttonVariants({ size: "lg" })}>
        <ButtonRoll>
          <IconPlus aria-hidden data-icon="inline-start" />
          {t.newMaster}
        </ButtonRoll>
      </Link>
    ) : null;

  // No row: the archive, the filters, the tab or the catalog is empty.
  const empty =
    archived && !filtering ? (
      <EmptyState
        icon={IconBoxArchive}
        title={fr.records.archivedEmpty.master}
        body={fr.records.archivedEmptyBody}
        action={
          <LiveViewLink
            href={viewHref(routes.masters, { state: titleViewParam(view) })}
          />
        }
      />
    ) : filtering ? (
      <EmptyState
        icon={IconDisc}
        title={t.filtersEmpty}
        body={t.filtersEmptyBody}
      />
    ) : all.length > 0 && view !== "all" ? (
      <EmptyState
        icon={IconDisc}
        title={t.filteredEmpty[view]}
        body={t.filteredEmptyBody}
        action={newMaster}
      />
    ) : (
      <EmptyState
        icon={IconDisc}
        title={t.emptyTitle}
        body={newMaster ? t.emptyBody : t.emptyBodyReadOnly}
        action={newMaster}
      />
    );

  return (
    <SectionFrame
      title={t.title}
      description={t.subtitle}
      action={all.length > 0 ? newMaster : null}
      toolsAction
    >
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : (
        <TitleListViews
          view={view}
          counts={countTitleViews(filtered)}
          demoCount={
            demoRows.filter((d) => d.demoStatus !== "abandoned").length
          }
          archived={archived}
          filters={{ ...filters }}
          pageAction={all.length > 0 ? newMaster : null}
        >
          {all.length === 0 ? (
            empty
          ) : (
            <MastersList
              masters={masters}
              covers={covers}
              rights={{
                canEdit: can(access, "manage_catalog"),
                canArchive,
                archived,
              }}
              filters={
                <UrlFilters
                  path={routes.masters}
                  params={{ state: titleViewParam(view) }}
                  groups={[
                    ...filterGroups(ofView, filters),
                    ...(canArchive ? [archiveFilterGroup(archived)] : []),
                  ]}
                />
              }
              empty={empty}
            />
          )}
        </TitleListViews>
      )}
    </SectionFrame>
  );
}

// What the tab's titles hold: their audio steps, their artists, their
// projects, each by name.
function filterGroups(
  titles: MasterRow[],
  current: TitleFilters,
): UrlFilterGroup[] {
  const t = fr.catalog.masters.filters;
  const artists = new Map<string, string>();
  const projects = new Map<string, string>();
  for (const title of titles) {
    for (const a of title.credited) artists.set(a.id, a.name);
    for (const p of title.projects) projects.set(p.id, p.title);
  }
  return [
    {
      key: "audio",
      label: t.audioLabel,
      allLabel: t.audioAll,
      options: AUDIO_FILTERS.filter((value) =>
        titles.some((title) => (title.audioState ?? "none") === value),
      ).map((value) => ({
        value,
        label: value === "none" ? t.none : fr.catalog.audioStates[value],
      })),
      current: current.audio,
    },
    {
      key: "artist",
      label: t.artistLabel,
      allLabel: t.artistAll,
      options: optionsByName(artists),
      current: current.artist,
    },
    {
      key: "project",
      label: t.projectLabel,
      allLabel: t.projectAll,
      options: optionsByName(projects),
      current: current.project,
    },
  ];
}
