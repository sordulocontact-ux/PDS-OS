import { ArchiveViewToggle } from "@/components/archive/archive-view-toggle";
import { DataTableViews } from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import {
  TITLE_VIEWS,
  titleViewParam,
  type TitleView,
} from "@/lib/catalog/title-views";
import { catalog } from "@/lib/i18n/fr/catalog";
import { viewHref } from "@/lib/ui/view-href";

const fr = { catalog };

// Views of the Catalogue, in the URL: where the song stands as tabs (Tous,
// En création, En production, Finalisés, with their counts) and, for the
// director, live or archived records at the end of the bar. Each axis keeps
// the others' choice (the filters included, which sit beside the search).
// Same shape as ArtistListViews.
export function TitleListViews({
  view,
  counts,
  archived,
  canArchive,
  filters,
  children,
}: {
  view: TitleView;
  counts: Record<TitleView, number>;
  archived: boolean;
  canArchive: boolean;
  // The active filters (?audio=, ?artist=, ?project=), kept by the tabs.
  filters: Record<string, string | null>;
  children: React.ReactNode;
}) {
  const t = fr.catalog.masters.views;
  const state = titleViewParam(view);

  return (
    <DataTableViews
      label={t.label}
      views={TITLE_VIEWS.map((value) => ({
        href: viewHref(routes.masters, {
          ...filters,
          state: titleViewParam(value),
          view: archived ? "archived" : null,
        }),
        label: t[value],
        count: counts[value],
        current: view === value,
      }))}
      action={
        canArchive && (
          <ArchiveViewToggle
            path={routes.masters}
            archived={archived}
            params={Object.fromEntries(
              Object.entries({ ...filters, state }).filter(
                (entry): entry is [string, string] => entry[1] !== null,
              ),
            )}
          />
        )
      }
    >
      {children}
    </DataTableViews>
  );
}
