"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ProjectsTable } from "@/components/projects/projects-table";
import { DataTableViews } from "@/components/ui/data-table-views";
import {
  FilterBar,
  ListToolbar,
  type FilterControl,
} from "@/components/ui/filter-bar";
import { SearchField } from "@/components/ui/search-field";
import type { RecordRights } from "@/lib/archive/types";
import { records } from "@/lib/i18n/fr/records";
import { shell } from "@/lib/i18n/fr/shell";
import { todayInParis } from "@/lib/insights/dates";
import {
  filterParamOf,
  filterValues,
  optionsOfNames,
} from "@/lib/ui/filter-options";
import type { ProjectDraftItem } from "@/lib/projects/drafts";
import {
  ADMIN_STATUSES,
  DUE_FILTERS,
  NO_FILTERS,
  PROJECT_VIEWS,
  draftMatches,
  isDraftProject,
  type DueChoice,
  matchesFilters,
  type ProjectFilters,
  type ProjectView,
} from "@/lib/projects/list-view";
import {
  PROJECT_TYPES,
  type ProjectListItem,
  type ProjectType,
} from "@/lib/projects/types";

const fr = { shell, records };

const ANY = "any";
const VIEW_PARAM = "vue";

// The filters and their URL params; the search is `q`.
const FILTER_PARAMS = {
  type: "type",
  artist: "artiste",
  responsible: "responsable",
  status: "statut",
  due: "echeance",
} as const;
type FilterKey = keyof typeof FILTER_PARAMS;

// The values of a param the list knows (a type, a status), the others left
// out.
const known = <V extends string>(values: string[], allowed: readonly V[]) =>
  values.filter((v): v is V => (allowed as readonly string[]).includes(v));

/**
 * The Projects page's list (PROJ-UX-01): Tous | Brouillons | Actifs |
 * Archivés with counts that are exactly the rows shown, then one line
 * (Figma 90:4972): a search over project, artist and responsible, then
 * the « Filtres » panel (Artiste, Type, Responsable, Statut, Échéance,
 * several choices each); all combine. The tab and the filters stay in the URL; the archive stays the
 * server's (`?view=archived`).
 */
export function ProjectsBrowser({
  projects,
  drafts,
  archived,
  archivedCount,
  rights,
  archivedHref,
  liveHref,
  pageAction,
}: {
  projects: ProjectListItem[];
  drafts: ProjectDraftItem[];
  archived: boolean;
  // Null: the viewer has no archive (only the director has one).
  archivedCount: number | null;
  rights: RecordRights;
  archivedHref: string;
  liveHref: string;
  // The page's action, at the end of the views' line in the new style.
  pageAction?: React.ReactNode;
}) {
  const t = fr.shell.projects;
  const f = t.filters;
  const params = useSearchParams();
  const pathname = usePathname();
  const initialView = params.get(VIEW_PARAM);
  const [view, setView] = useState<ProjectView>(
    (PROJECT_VIEWS as readonly string[]).includes(initialView ?? "")
      ? (initialView as ProjectView)
      : "all",
  );
  const [filters, setFilters] = useState<ProjectFilters>(() => {
    const read = (key: FilterKey) =>
      filterValues(params.get(FILTER_PARAMS[key]));
    return {
      query: params.get("q") ?? "",
      type: known<ProjectType>(read("type"), PROJECT_TYPES),
      artist: read("artist"),
      responsible: read("responsible"),
      status: known(read("status"), ADMIN_STATUSES),
      due: known<DueChoice>(
        read("due"),
        DUE_FILTERS.filter((d): d is DueChoice => d !== ANY),
      ),
    };
  });

  // The URL says the tab and the filters (shared, back button), without a
  // new request: the list is already here.
  const sync = (nextView: ProjectView, next: ProjectFilters) => {
    const query = new URLSearchParams(params.toString());
    const set = (key: string, value: string | null) =>
      value ? query.set(key, value) : query.delete(key);
    set(VIEW_PARAM, nextView === "all" ? null : nextView);
    set("q", next.query.trim() || null);
    for (const key of Object.keys(FILTER_PARAMS) as FilterKey[])
      set(FILTER_PARAMS[key], filterParamOf(next[key]));
    const text = query.toString();
    window.history.replaceState(
      null,
      "",
      text ? `${pathname}?${text}` : pathname,
    );
  };
  const change = (patch: Partial<ProjectFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    sync(view, next);
  };

  const today = todayInParis();
  const shown = useMemo(
    () => projects.filter((p) => matchesFilters(p, filters, today)),
    [projects, filters, today],
  );
  const shownDrafts = archived
    ? []
    : drafts.filter((draft) =>
        draftMatches(
          { title: draft.title || fr.shell.newProject.draft.untitled },
          filters,
        ),
      );
  const draftProjects = shown.filter(isDraftProject);
  const activeProjects = shown.filter((p) => !isDraftProject(p));
  const counts: Record<ProjectView, number> = {
    all: shownDrafts.length + shown.length,
    drafts: shownDrafts.length + draftProjects.length,
    active: activeProjects.length,
  };
  const rows =
    archived || view === "all"
      ? { projects: shown, drafts: shownDrafts }
      : view === "drafts"
        ? { projects: draftProjects, drafts: shownDrafts }
        : { projects: activeProjects, drafts: [] };

  const responsibles = new Map(
    projects.flatMap((p) =>
      p.responsiblePersonId && p.responsibleName
        ? [[p.responsiblePersonId, p.responsibleName] as const]
        : [],
    ),
  );

  const tabs = [
    ...PROJECT_VIEWS.map((key) =>
      archived
        ? {
            label: t.views[key],
            href: key === "all" ? liveHref : `${liveHref}?${VIEW_PARAM}=${key}`,
            current: false,
          }
        : {
            label: t.views[key],
            count: counts[key],
            current: view === key,
            onSelect: () => {
              setView(key);
              sync(key, filters);
            },
          },
    ),
    ...(archivedCount === null
      ? []
      : [
          {
            label: fr.records.view.archived,
            count: archived ? shown.length : archivedCount,
            href: archivedHref,
            current: archived,
          },
        ]),
  ];

  const control = (
    key: FilterKey,
    label: string,
    allLabel: string,
    options: [string, string][],
  ): FilterControl => ({
    key,
    label,
    allLabel,
    options: options.map(([value, text]) => ({ value, label: text })),
    values: filters[key],
    onChange: (values) => change({ [key]: values } as Partial<ProjectFilters>),
  });
  // Five axes: all of them in the « Filtres » panel (Sacha 24/11/2026).
  const artists = optionsOfNames(projects.map((p) => p.artistName));
  const controls = [
    control(
      "artist",
      f.artist,
      f.allArtists,
      artists.map((option) => [option.value, option.label]),
    ),
    control(
      "type",
      f.type,
      f.allTypes,
      PROJECT_TYPES.map((type) => [type, fr.shell.projectTypes[type]]),
    ),
    control("responsible", f.responsible, f.allResponsibles, [...responsibles]),
    control(
      "status",
      f.status,
      f.allStatuses,
      ADMIN_STATUSES.map((st) => [st, t.adminStatuses[st]]),
    ),
    control(
      "due",
      f.due,
      f.dues[ANY],
      DUE_FILTERS.filter((d) => d !== ANY).map((d) => [d, f.dues[d]]),
    ),
  ];

  return (
    <DataTableViews
      label={fr.records.view.label}
      views={tabs}
      pageAction={pageAction}
    >
      <ListToolbar
        search={
          <SearchField
            aria-label={t.searchLabel}
            placeholder={t.search}
            value={filters.query}
            onChange={(e) => change({ query: e.target.value })}
          />
        }
      >
        <FilterBar
          filters={controls}
          onClear={() => change({ ...NO_FILTERS, query: filters.query })}
        />
      </ListToolbar>
      {rows.projects.length + rows.drafts.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{f.noMatch}</p>
      ) : (
        <ProjectsTable
          selectable
          projects={rows.projects}
          drafts={rows.drafts}
          rights={rights}
        />
      )}
    </DataTableViews>
  );
}
