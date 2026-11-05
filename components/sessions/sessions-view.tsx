import { IconSliders } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { SessionFormButton } from "@/components/sessions/session-form-button";
import { SessionsList } from "@/components/sessions/sessions-list";
import { EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import { todayInParis } from "@/lib/insights/dates";
import { sessions } from "@/lib/i18n/fr/sessions";
import {
  inSessionView,
  SESSION_VIEWS,
  type SessionView,
  type StudioSessionRow,
} from "@/lib/sessions/types";
import { viewHref } from "@/lib/ui/view-href";

const fr = { sessions };

/**
 * A list of sessions with its tabs (À venir, Passées, Toutes, in the URL),
 * its search and its empty states: the menu's page, an artist's tab, a
 * project's section. `scope`: the artist or project it is opened from (its
 * column hidden, « Nouvelle session » with it already chosen).
 */
export function SessionsView({
  rows,
  error,
  view,
  path,
  canCreate,
  scope,
}: {
  rows: StudioSessionRow[];
  error: boolean;
  view: SessionView;
  path: string;
  canCreate: boolean;
  scope?: { artistId: string } | { projectId: string };
}) {
  const t = fr.sessions;
  if (error) return <FormMessage kind="error">{t.loadError}</FormMessage>;
  const today = todayInParis();
  const visible = rows.filter((s) => inSessionView(s, view, today));
  const create = canCreate ? (
    <SessionFormButton
      size={scope ? "sm" : "lg"}
      variant={scope ? "outline" : "default"}
      artistId={scope && "artistId" in scope ? scope.artistId : undefined}
      projectId={scope && "projectId" in scope ? scope.projectId : undefined}
    />
  ) : null;

  if (rows.length === 0)
    return (
      <EmptyState
        icon={IconSliders}
        title={
          scope
            ? "artistId" in scope
              ? t.empty.artist
              : t.empty.project
            : t.empty.title
        }
        body={
          scope
            ? t.empty.linkedBody
            : create
              ? t.empty.body
              : t.empty.bodyReadOnly
        }
        action={create}
      />
    );

  return (
    <DataTableViews
      label={t.views.label}
      action={scope ? create : null}
      views={SESSION_VIEWS.map((value) => ({
        href: viewHref(path, { vue: value === "upcoming" ? null : value }),
        label: t.views[value],
        count: rows.filter((s) => inSessionView(s, value, today)).length,
        current: view === value,
      }))}
    >
      {visible.length === 0 ? (
        <EmptyState
          icon={IconSliders}
          title={view === "past" ? t.empty.past : t.empty.upcoming}
          body={t.empty.viewBody}
        />
      ) : (
        <SessionsList
          sessions={visible}
          hide={
            scope ? ("artistId" in scope ? "artists" : "projects") : undefined
          }
        />
      )}
    </DataTableViews>
  );
}
