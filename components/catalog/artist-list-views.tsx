import { ArchiveViewToggle } from "@/components/archive/archive-view-toggle";
import { DataTableViews } from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { ARTIST_RELATIONS, type ArtistRelation } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { viewHref } from "@/lib/ui/view-href";

const fr = { catalog };

export type RelationCounts = Record<ArtistRelation | "all", number>;

// Views of the artist list, in the URL: the relation with PDS as tabs
// (Tous, Signés, Collaborations, with their counts), « Filtres » and, for
// the director, live or archived records at the end of the bar. Each axis
// keeps the others' choice.
export function ArtistListViews({
  relation,
  counts,
  archived,
  canArchive,
  filters,
  filterBar,
  children,
}: {
  relation: ArtistRelation | null;
  counts: RelationCounts;
  archived: boolean;
  canArchive: boolean;
  // The active filters (?titles=), kept by the tabs and the archive toggle.
  filters: Record<string, string | null>;
  // « Filtres » (UrlFilters), before the archive toggle.
  filterBar: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = fr.catalog.relation.filter;
  const view = archived ? "archived" : null;

  return (
    <DataTableViews
      label={t.label}
      views={[
        {
          href: viewHref(routes.artists, { ...filters, view }),
          label: t.all,
          count: counts.all,
          current: relation === null,
        },
        ...ARTIST_RELATIONS.map((value) => ({
          href: viewHref(routes.artists, { ...filters, relation: value, view }),
          label: t[value],
          count: counts[value],
          current: relation === value,
        })),
      ]}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {filterBar}
          {canArchive && (
            <ArchiveViewToggle
              path={routes.artists}
              archived={archived}
              params={Object.fromEntries(
                Object.entries<string | null>({ ...filters, relation }).filter(
                  (entry): entry is [string, string] => entry[1] !== null,
                ),
              )}
            />
          )}
        </div>
      }
    >
      {children}
    </DataTableViews>
  );
}
