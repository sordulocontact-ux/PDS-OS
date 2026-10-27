"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Button } from "@/components/ui/button";
import { DataTableViews } from "@/components/ui/data-table-views";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import type { RecordRights } from "@/lib/archive/types";
import { records } from "@/lib/i18n/fr/records";
import { shell } from "@/lib/i18n/fr/shell";
import { todayInParis } from "@/lib/insights/dates";
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
 * Archivés with counts that are exactly the rows shown, a search over
 * project, artist and responsible, and four filters that combine (Type,
 * Responsable, Statut, Échéance). The tab and the filters stay in the URL;
 * the archive stays the server's (`?view=archived`).
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
  const filtered =
    filters.query.trim() !== "" ||
    filters.type !== ANY ||
    filters.responsible !== ANY ||
    filters.status !== ANY ||
    filters.due !== ANY;

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

  const select = (
    id: string,
    label: string,
    value: string,
    options: Record<string, string>,
    onChange: (value: string) => void,
  ) => (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-caption">
        {label}
      </Label>
      <OptionSelect
        id={id}
        label={label}
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <SearchField
          aria-label={t.searchLabel}
          placeholder={t.search}
          value={filters.query}
          onChange={(e) => change({ query: e.target.value })}
        />
        <div className="flex flex-wrap items-end gap-3">
          {select(
            "filter-type",
            f.type,
            filters.type,
            {
              [ANY]: f.any,
              ...Object.fromEntries(
                PROJECT_TYPES.map((type) => [
                  type,
                  fr.shell.projectTypes[type],
                ]),
              ),
            },
            (v) => change({ type: v as ProjectFilters["type"] }),
          )}
          {select(
            "filter-responsible",
            f.responsible,
            filters.responsible,
            { [ANY]: f.anyone, ...Object.fromEntries(responsibles) },
            (v) => change({ responsible: v }),
          )}
          {select(
            "filter-status",
            f.status,
            filters.status,
            {
              [ANY]: f.any,
              ...Object.fromEntries(
                ADMIN_STATUSES.map((s) => [s, t.adminStatuses[s]]),
              ),
            },
            (v) => change({ status: v as ProjectFilters["status"] }),
          )}
          {select(
            "filter-due",
            f.due,
            filters.due,
            Object.fromEntries(DUE_FILTERS.map((d) => [d, f.dues[d]])),
            (v) => change({ due: v as ProjectFilters["due"] }),
          )}
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => change(NO_FILTERS)}
            >
              {f.clear}
            </Button>
          )}
        </div>
      </div>
      <DataTableViews label={fr.records.view.label} views={tabs}>
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
    </div>
  );
}
