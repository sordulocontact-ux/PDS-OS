import { ArchiveViewToggle } from "@/components/archive/archive-view-toggle";
import { TabFilter } from "@/components/ui/tab-filter";
import { routes } from "@/lib/auth/redirects";
import { ARTIST_RELATIONS, type ArtistRelation } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export type RelationCounts = Record<ArtistRelation | "all", number>;

// Filters of the artist list, in the URL: the relation with PDS as tabs
// (Tous, Signés, Collaborations, with their counts) and, for the director,
// live or archived records at the end of the bar. Two separate axes: each
// one keeps the other's choice.
export function ArtistListFilters({
  relation,
  counts,
  archived,
  canArchive,
}: {
  relation: ArtistRelation | null;
  counts: RelationCounts;
  archived: boolean;
  canArchive: boolean;
}) {
  const t = fr.catalog.relation.filter;
  const href = (value: ArtistRelation | null) => {
    const query = new URLSearchParams();
    if (value) query.set("relation", value);
    if (archived) query.set("view", "archived");
    const search = query.toString();
    return search ? `${routes.artists}?${search}` : routes.artists;
  };

  return (
    <TabFilter
      label={t.label}
      options={[
        {
          href: href(null),
          label: t.all,
          count: counts.all,
          current: relation === null,
        },
        ...ARTIST_RELATIONS.map((value) => ({
          href: href(value),
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
    />
  );
}
