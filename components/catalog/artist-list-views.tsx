import { DataTableViews } from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { ARTIST_RELATIONS, type ArtistRelation } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { viewHref } from "@/lib/ui/view-href";

const fr = { catalog };

export type RelationCounts = Record<ArtistRelation | "all", number>;

// Views of the artist list, in the URL: the relation with PDS as tabs
// (Tous, Signés, Collaborations, with their counts); live or archived
// records sit behind the filter button. Each axis keeps the others' choice.
export function ArtistListViews({
  relation,
  counts,
  archived,
  filters,
  children,
}: {
  relation: ArtistRelation | null;
  counts: RelationCounts;
  archived: boolean;
  // The active filters (?titles=), kept by the tabs.
  filters: Record<string, string | null>;
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
    >
      {children}
    </DataTableViews>
  );
}
