import { ArchiveViewToggle } from "@/components/archive/archive-view-toggle";
import { DataTableViews } from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import {
  TITLE_VIEWS,
  titleViewParam,
  type TitleView,
} from "@/lib/catalog/title-views";
import { fr } from "@/lib/i18n/fr";
import { viewHref } from "@/lib/ui/view-href";

// Views of the Titres list, in the URL: the audio state as tabs (Hors
// maquettes by default, each state, Tous, with their counts) and, for the
// director, live or archived records at the end of the bar. Two separate
// axes: each one keeps the other's choice. Same shape as ArtistListViews.
export function TitleListViews({
  view,
  counts,
  archived,
  canArchive,
  children,
}: {
  view: TitleView;
  counts: Record<TitleView, number>;
  archived: boolean;
  canArchive: boolean;
  children: React.ReactNode;
}) {
  const t = fr.catalog.masters.views;
  const state = titleViewParam(view);

  return (
    <DataTableViews
      label={t.label}
      views={TITLE_VIEWS.map((value) => ({
        href: viewHref(routes.masters, {
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
            params={state ? { state } : undefined}
          />
        )
      }
    >
      {children}
    </DataTableViews>
  );
}
