import { DataTableViews } from "@/components/ui/data-table";
import type { TabBarItem } from "@/components/ui/tab-bar";
import { routes } from "@/lib/auth/redirects";
import {
  TITLE_VIEWS,
  titleViewParam,
  type TitleView,
} from "@/lib/catalog/title-views";
import { catalog } from "@/lib/i18n/fr/catalog";
import { demos } from "@/lib/i18n/fr/demos";
import { viewHref } from "@/lib/ui/view-href";

const fr = { catalog, demos };

// Views of the Catalogue, in the URL: where the song stands as tabs (Tous,
// En création, En production, Finalisés, with their counts); live or
// archived records sit behind the filter button. Each axis keeps the
// others' choice (the filters included, which sit beside the search).
// Same shape as ArtistListViews.
// Last tab, « Maquettes » (retours d'Ibé du 01 et du 05/11/2026): the
// titles not yet decided for a release, on their own page (routes.demos).
export function TitleListViews({
  view,
  counts,
  demoCount,
  archived,
  filters,
  children,
}: {
  view: TitleView | "demos";
  counts: Record<TitleView, number>;
  // Maquettes under way (abandoned ones left out).
  demoCount: number;
  archived: boolean;
  // The active filters (?audio=, ?artist=, ?project=), kept by the tabs.
  filters: Record<string, string | null>;
  children: React.ReactNode;
}) {
  const t = fr.catalog.masters.views;

  return (
    <DataTableViews
      label={t.label}
      views={TITLE_VIEWS.map((value): TabBarItem => ({
        href: viewHref(routes.masters, {
          ...filters,
          state: titleViewParam(value),
          view: archived ? "archived" : null,
        }),
        label: t[value],
        count: counts[value],
        current: view === value,
      })).concat(
        archived
          ? []
          : [
              {
                href: routes.demos,
                label: fr.demos.tab,
                count: demoCount,
                current: view === "demos",
              },
            ],
      )}
    >
      {children}
    </DataTableViews>
  );
}
