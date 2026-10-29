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
import { optionsOfNames } from "@/lib/ui/filter-options";
import type { ProjectDraftItem } from "@/lib/projects/drafts";
import {
  ADMIN_STATUSES,
  DUE_FILTERS,
  NO_FILTERS,
  PROJECT_VIEWS,
  draftMatches,
  isDraftProject,
  matchesFilters,
  type ProjectFilters,
  type ProjectView,
} from "@/lib/projects/list-view";
import { PROJECT_TYPES, type ProjectListItem } from "@/lib/projects/types";

const fr = { shell, records };

const ANY = "any";
const VIEW_PARAM = "vue";

/**
 * The Projects page's list (PROJ-UX-01): Tous | Brouillons | Actifs |
 * Archivés with counts that are exactly the rows shown, then one line
 * (Figma 90:4972): a search over project, artist and responsible, Artiste,
 * Responsable and Type as selects, Statut and Échéance behind the filter
 * button; all combine. The tab and the filters stay in the URL; the archive stays the
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
}: {
  projects: ProjectListItem[];
  drafts: ProjectDraftItem[];
  archived: boolean;
  // Null: the viewer has no archive (only the director has one).
  archivedCount: number | null;
  rights: RecordRights;
  archivedHref: string;
  liveHref: string;
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
  const [filters, setFilters] = useState<ProjectFilters>(() => ({
    ...NO_FILTERS,
    query: params.get("q") ?? "",
    type: (PROJECT_TYPES as readonly string[]).includes(
      params.get("type") ?? "",
    )
      ? (params.get("type") as ProjectFilters["type"])
      : ANY,
    artist: params.get("artiste") ?? ANY,
    responsible: params.get("responsable") ?? ANY,
    status: (ADMIN_STATUSES as readonly string[]).includes(
      params.get("statut") ?? "",
    )
      ? (params.get("statut") as ProjectFilters["status"])
      : ANY,
    due: (DUE_FILTERS as readonly string[]).includes(
      params.get("echeance") ?? "",
    )
      ? (params.get("echeance") as ProjectFilters["due"])
      : ANY,
  }));

  // The URL says the tab and the filters (shared, back button), without a
  // new request: the list is already here.
  const sync = (nextView: ProjectView, next: ProjectFilters) => {
    const query = new URLSearchParams(params.toString());
    const set = (key: string, value: string, empty: string) =>
      value && value !== empty ? query.set(key, value) : query.delete(key);
    set(VIEW_PARAM, nextView, "all");
    set("q", next.query.trim(), "");
    set("type", next.type, ANY);
    set("artiste", next.artist, ANY);
    set("responsable", next.responsible, ANY);
    set("statut", next.status, ANY);
    set("echeance", next.due, ANY);
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

  // ANY in the state is "no filter" in the bar.
  const control = (
    key: keyof Omit<ProjectFilters, "query">,
    label: string,
    allLabel: string,
    options: [string, string][],
  ): FilterControl => ({
    key,
    label,
    allLabel,
    options: options.map(([value, text]) => ({ value, label: text })),
    value: filters[key] === ANY ? null : filters[key],
    onChange: (value) =>
      change({ [key]: value ?? ANY } as Partial<ProjectFilters>),
  });
  // Artiste, Responsable, Type on the line; Statut and Échéance behind the
  // filter button (Sacha 29/10).
  const artists = optionsOfNames(projects.map((p) => p.artistName));
  const controls = [
    control(
      "artist",
      f.artist,
      f.allArtists,
      artists.map((option) => [option.value, option.label]),
    ),
    control("responsible", f.responsible, f.allResponsibles, [...responsibles]),
    control(
      "type",
      f.type,
      f.allTypes,
      PROJECT_TYPES.map((type) => [type, fr.shell.projectTypes[type]]),
    ),
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
    <DataTableViews label={fr.records.view.label} views={tabs}>
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
