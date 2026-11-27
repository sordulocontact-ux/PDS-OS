import { IconPenWriting4 } from "nucleo-sharp-essential";

import { NotesList } from "@/components/notes/notes-list";
import { notesPath } from "@/components/notes/notes-path";
import { EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters, type UrlFilterGroup } from "@/components/ui/url-filters";
import type { CallDeleter } from "@/lib/calls/delete-rule";
import type { CallDoor } from "@/lib/calls/door";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteProjectOption } from "@/lib/notes/options";
import { inNoteTab, type NoteRow, type NoteTab } from "@/lib/notes/views";
import {
  filterParamOf,
  matchesAny,
  matchesSome,
  optionsByName,
} from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";

const fr = { notes };

// The project filter's values for what belongs to no project.
const INTERNAL = "internal";
const TEAM = "team";

const projectOf = (row: NoteRow) =>
  row.kind === "call"
    ? (row.call.projectId ?? INTERNAL)
    : (row.projectId ?? TEAM);

const peopleOf = (row: NoteRow) =>
  (row.kind === "call" ? row.people : [row.author]).map((p) => p.personId);

/**
 * A door's Notes, the same from the main navigation and from a project (like
 * CallsListView): the tabs (?tab=) Toutes / Calls / Écrites / À compléter,
 * with « À venir » in a project (no calendar there) — each counting what
 * the filters keep — the search, the filters Projet (Notes only, ?project=)
 * and Personne (?person=), the rows (NotesList) and the empty states.
 * `empty`: what stands for a door without any row.
 */
export function NotesListView({
  rows,
  now,
  door,
  tab,
  project,
  person,
  deleter,
  projects,
  empty,
  pageAction,
}: {
  rows: NoteRow[];
  now: Date;
  door: CallDoor;
  // ?tab= (null: Toutes).
  tab: NoteTab | null;
  // ?project= of Notes: projects' ids, « internal » or « team ».
  project: string[];
  // ?person=: people's ids.
  person: string[];
  deleter: CallDeleter;
  // The projects a note can be pinned to (its form).
  projects: NoteProjectOption[];
  empty: React.ReactNode;
  // The page's own action, at the end of the tabs' line (SectionFrame
  // `toolsAction`).
  pageAction?: React.ReactNode;
}) {
  if (rows.length === 0) return empty;
  const t = fr.notes;
  const path = notesPath(door);
  const withProject = door.kind === "calls";
  const tabs: NoteTab[] = withProject
    ? ["all", "calls", "written", "todo"]
    : ["all", "upcoming", "calls", "written", "todo"];
  const current: NoteTab = tab && tabs.includes(tab) ? tab : "all";
  const kept = {
    project: withProject ? filterParamOf(project) : null,
    person: filterParamOf(person),
  };
  const matches = (row: NoteRow) =>
    (!withProject || matchesAny(project, projectOf(row))) &&
    matchesSome(person, peopleOf(row));

  // The tabs count what the filters keep; the filters offer what the tab
  // holds.
  const filtered = rows.filter(matches);
  const inTab = (list: NoteRow[], of: NoteTab) =>
    list.filter((row) => inNoteTab(row, of, now));
  const ofTab = inTab(rows, current);
  const shown = inTab(filtered, current);
  // Calls to come: the next one first.
  if (current === "upcoming")
    shown.sort((a, b) =>
      a.kind === "call" && b.kind === "call"
        ? a.call.occurredAt.localeCompare(b.call.occurredAt)
        : 0,
    );
  const filtering = project.length > 0 || person.length > 0;
  const tabHref = (value: NoteTab) =>
    viewHref(path, { ...kept, tab: value === "all" ? null : value });

  return (
    <DataTableViews
      label={t.tabs.label}
      pageAction={pageAction}
      views={tabs.map((value) => ({
        href: tabHref(value),
        label: t.tabs[value],
        count: inTab(filtered, value).length,
        current: current === value,
      }))}
    >
      <NotesList
        rows={shown}
        now={now}
        door={door}
        deleter={deleter}
        projects={projects}
        filters={
          <UrlFilters
            path={path}
            params={{ tab: current === "all" ? null : current }}
            groups={filterGroups(ofTab, project, person, withProject)}
          />
        }
        empty={
          <EmptyState
            icon={IconPenWriting4}
            title={filtering ? t.empty.search : t.empty[current]}
          />
        }
      />
    </DataTableViews>
  );
}

// The projects some row of the tab belongs to, what belongs to none last;
// the people in them (members of a call, authors of a note).
function filterGroups(
  rows: NoteRow[],
  project: string[],
  person: string[],
  withProject: boolean,
): UrlFilterGroup[] {
  const t = fr.notes;
  const projects = new Map<string, string>();
  const people = new Map<string, string>();
  for (const row of rows) {
    if (row.kind === "call") {
      if (row.call.projectId && row.call.projectTitle)
        projects.set(row.call.projectId, row.call.projectTitle);
      for (const p of row.people) people.set(p.personId, p.name);
    } else {
      if (row.projectId && row.projectTitle)
        projects.set(row.projectId, row.projectTitle);
      people.set(row.author.personId, row.author.name);
    }
  }
  const hasInternal = rows.some(
    (row) => row.kind === "call" && !row.call.projectId,
  );
  const hasTeam = rows.some((row) => row.kind === "written" && !row.projectId);
  const groups: UrlFilterGroup[] = [];
  if (withProject)
    groups.push({
      key: "project",
      label: t.filters.project,
      allLabel: t.filters.allProjects,
      options: [
        ...optionsByName(projects),
        ...(hasInternal ? [{ value: INTERNAL, label: t.internalCall }] : []),
        ...(hasTeam ? [{ value: TEAM, label: t.teamNote }] : []),
      ],
      current: project,
    });
  groups.push({
    key: "person",
    label: t.filters.person,
    allLabel: t.filters.everyone,
    options: optionsByName(people),
    current: person,
  });
  return groups;
}
