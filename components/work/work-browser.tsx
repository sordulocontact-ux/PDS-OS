"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { EmptyNote } from "@/components/shell/empty-state";
import {
  FilterBar,
  ListToolbar,
  type FilterControl,
} from "@/components/ui/filter-bar";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { work } from "@/lib/i18n/fr/work";
import { optionsByName } from "@/lib/ui/filter-options";
import { normalizeSearch } from "@/lib/utils/search";
import {
  WORK_GROUPS,
  WORK_VIEWS,
  inView,
  type WorkRow,
  type WorkView,
} from "@/lib/work/rows";

import { moduleOf, placeOf, titleOf } from "./work-row";
import { WorkTable } from "./work-table";

const fr = { work };

const VIEW_PARAM = "vue";

// The filters and their URL params; the search is `q`.
const FILTER_PARAMS = {
  project: "projet",
  module: "module",
  group: "echeance",
} as const;
type WorkFilters = Record<keyof typeof FILTER_PARAMS, string | null>;

const matches = (row: WorkRow, filters: WorkFilters, needle: string) =>
  (!filters.project || row.projectId === filters.project) &&
  (!filters.module || row.module === filters.module) &&
  (!filters.group || row.group === filters.group) &&
  (!needle ||
    normalizeSearch(
      [titleOf(row), row.projectTitle, moduleOf(row), placeOf(row)]
        .filter(Boolean)
        .join(" "),
    ).includes(needle));

/**
 * The global Travail under its lead: Tout | À faire | À valider in a
 * segmented control (never a second row of tabs under the page's), each
 * count being every action of the view (« Maintenant » included), then one
 * table whose rows are grouped by when — En retard, Cette semaine, Plus
 * tard, Sans échéance, and what waits for someone else. Above the table,
 * the search and the filters (Projet, Module, Échéance) of every list page.
 * Filtered in place (the rows are already here), the tab and the filters
 * kept in the URL like the Projects page. `lead`: the row « Maintenant » shows, never repeated here.
 */
export function WorkBrowser({
  rows,
  lead,
}: {
  rows: WorkRow[];
  lead: string | null;
}) {
  const t = fr.work.table;
  const params = useSearchParams();
  const pathname = usePathname();
  const initial = params.get(VIEW_PARAM);
  const [view, setView] = useState<WorkView>(
    (WORK_VIEWS as readonly string[]).includes(initial ?? "")
      ? (initial as WorkView)
      : "all",
  );

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filters, setFilters] = useState<WorkFilters>(() => ({
    project: params.get(FILTER_PARAMS.project),
    module: params.get(FILTER_PARAMS.module),
    group: params.get(FILTER_PARAMS.group),
  }));

  // The URL says the tab, the search and the filters (shared, back button),
  // without a new request: the rows are already here.
  const sync = (next: {
    view: WorkView;
    query: string;
    filters: WorkFilters;
  }) => {
    const url = new URLSearchParams(params.toString());
    const set = (key: string, value: string | null) =>
      value ? url.set(key, value) : url.delete(key);
    set(VIEW_PARAM, next.view === "all" ? null : next.view);
    set("q", next.query.trim() || null);
    for (const key of Object.keys(FILTER_PARAMS) as (keyof WorkFilters)[])
      set(FILTER_PARAMS[key], next.filters[key]);
    const text = url.toString();
    window.history.replaceState(
      null,
      "",
      text ? `${pathname}?${text}` : pathname,
    );
  };
  const select = (next: WorkView) => {
    setView(next);
    sync({ view: next, query, filters });
  };
  const search = (next: string) => {
    setQuery(next);
    sync({ view, query: next, filters });
  };
  const filter = (next: WorkFilters) => {
    setFilters(next);
    sync({ view, query, filters: next });
  };

  // The tabs count what the search and the filters keep.
  const needle = normalizeSearch(query);
  const kept = rows.filter((row) => matches(row, filters, needle));
  const listed = kept.filter((row) => row.key !== lead);
  const shown = listed.filter((row) => inView(row, view));
  const views = WORK_VIEWS.map((key) => ({
    value: key,
    label: (
      <>
        {t.views[key]}
        <span className="ml-1.5 text-[color:var(--text-tertiary)] tabular-nums">
          {kept.filter((row) => inView(row, key)).length}
        </span>
      </>
    ),
  }));
  const groups = WORK_GROUPS.map((group) => ({
    group,
    rows: shown.filter((row) => row.group === group),
  })).filter(({ rows: own }) => own.length > 0);

  // The choices: what the rows of the tab hold.
  const ofView = rows.filter((row) => inView(row, view));
  const projects = new Map(
    ofView.map((row) => [row.projectId, row.projectTitle]),
  );
  const modules = new Map(
    ofView.flatMap((row) => {
      const label = moduleOf(row);
      return row.module && label ? [[row.module, label] as const] : [];
    }),
  );
  const control = (
    key: keyof WorkFilters,
    label: string,
    allLabel: string,
    options: { value: string; label: string }[],
  ): FilterControl => ({
    key,
    label,
    allLabel,
    options,
    value: filters[key],
    onChange: (value) => filter({ ...filters, [key]: value }),
  });
  const f = t.filters;
  const controls = [
    control("project", f.project, f.allProjects, optionsByName(projects)),
    control("module", f.module, f.allModules, optionsByName(modules)),
    control(
      "group",
      f.due,
      f.allDues,
      WORK_GROUPS.filter((group) =>
        ofView.some((row) => row.group === group),
      ).map((group) => ({ value: group, label: t.groups[group] })),
    ),
  ];
  const narrowed =
    needle !== "" || Object.values(filters).some((value) => value !== null);

  return (
    <div className="flex flex-col gap-4">
      {/* A segmented control, not a second row of tabs under « Actions des
          projets | Mes tâches » (retour du 09/11/2026, « une double
          navigation »): the same place as « Matrice | Liste » there. */}
      <SegmentedControl
        aria-label={t.viewsLabel}
        className="self-start modern:hidden"
        options={views}
        value={view}
        onChange={(next) => next && select(next)}
      />
      <ListToolbar
        search={
          <SearchField
            aria-label={t.search.label}
            placeholder={t.search.placeholder}
            maxLength={100}
            value={query}
            onChange={(event) => search(event.target.value)}
          />
        }
      >
        <FilterBar
          filters={controls}
          onClear={() => filter({ project: null, module: null, group: null })}
        />
        {/* The new style: the views on the tools' line (§ 6.1). */}
        <SegmentedControl
          aria-label={t.viewsLabel}
          className="classic:hidden"
          options={views}
          value={view}
          onChange={(next) => next && select(next)}
        />
      </ListToolbar>
      {groups.length === 0 ? (
        <EmptyNote>{narrowed ? t.noMatch : t.viewEmpty[view]}</EmptyNote>
      ) : (
        <WorkTable groups={groups} />
      )}
    </div>
  );
}
