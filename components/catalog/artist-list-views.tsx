import { ArchiveViewToggle } from "@/components/archive/archive-view-toggle";
import { DataTableViews } from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { ARTIST_RELATIONS, type ArtistRelation } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { viewHref } from "@/lib/ui/view-href";

export type RelationCounts = Record<ArtistRelation | "all", number>;

// Views of the artist list, in the URL: the relation with PDS as tabs
// (Tous, Signés, Collaborations, with their counts) and, for the director,
// live or archived records at the end of the bar. Two separate axes: each
// one keeps the other's choice.
export function ArtistListViews({
  relation,
  counts,
  archived,
  canArchive,
  children,
}: {
  relation: ArtistRelation | null;
  counts: RelationCounts;
  archived: boolean;
  canArchive: boolean;
  children: React.ReactNode;
}) {
  const t = fr.catalog.relation.filter;
  const view = archived ? "archived" : null;

  return (
    <DataTableViews
      label={t.label}
      views={[
        {
          href: viewHref(routes.artists, { view }),
          label: t.all,
          count: counts.all,
          current: relation === null,
        },
        ...ARTIST_RELATIONS.map((value) => ({
          href: viewHref(routes.artists, { relation: value, view }),
          label: t[value],
          count: counts[value],
          current: relation === value,
        })),
      ]}
      action={
        canArchive && (
          <ArchiveViewToggle
            path={routes.artists}
            archived={archived}
            params={relation ? { relation } : undefined}
          />
        )
      }
    >
      {children}
    </DataTableViews>
  );
}
