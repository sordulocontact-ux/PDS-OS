import { IconPenWriting4 } from "nucleo-sharp-essential";

import { NotesList } from "@/components/notes/notes-list";
import { notesPath } from "@/components/notes/notes-path";
import { EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters, type UrlFilterGroup } from "@/components/ui/url-filters";
import type { CallDeleter } from "@/lib/calls/delete-rule";
import type { CallDoor } from "@/lib/calls/door";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteLinkChoices } from "@/lib/notes/options";
import { inNoteTab, type NoteRow, type NoteTab } from "@/lib/notes/views";
import {
  filterParamOf,
  matchesAny,
  matchesSome,
  optionsByName,
} from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";

const fr = { notes };

// The « Lié à » filter's values (?link=): « project:<id> », « deal:<id> »,
// « contract:<id> », and for what is linked to nothing an internal call or
// a note of the team.
const INTERNAL = "internal";
const TEAM = "team";

const linkValueOf = (row: NoteRow): string => {
  if (row.kind === "written")
    return row.link ? `${row.link.kind}:${row.link.id}` : TEAM;
  if (row.call.deal) return `deal:${row.call.deal.id}`;
  return row.call.projectId ? `project:${row.call.projectId}` : INTERNAL;
};

/** A row's link and its name in the filter; null for what has none. */
function linkOptionOf(row: NoteRow): [string, string] | null {
  if (row.kind === "written")
    return row.link ? [linkValueOf(row), row.link.label] : null;
  if (row.call.deal)
    return [linkValueOf(row), fr.notes.link.deal(row.call.deal.artistName)];
  return row.call.projectId && row.call.projectTitle
    ? [linkValueOf(row), row.call.projectTitle]
    : null;
}

const peopleOf = (row: NoteRow) =>
  (row.kind === "call" ? row.people : [row.author]).map((p) => p.personId);

/**
 * A door's Notes, the same from the main navigation and from a project (like
 * CallsListView): the tabs (?tab=) Toutes / Calls / Écrites / À compléter,
 * with « À venir » in a project (no calendar there) — each counting what
 * the filters keep — the search, the filters Lié à (Notes only, ?link=)
 * and Personne (?person=), the rows (NotesList) and the empty states.
 * `empty`: what stands for a door without any row.
 */
export function NotesListView({
  rows,
  now,
  door,
  tab,
  link,
  person,
  deleter,
  choices,
  empty,
  pageAction,
}: {
  rows: NoteRow[];
  now: Date;
  door: CallDoor;
  // ?tab= (null: Toutes).
  tab: NoteTab | null;
  // ?link= of Notes: « project:<id> », « deal:<id> », « contract:<id> »,
  // « internal » or « team ».
  link: string[];
  // ?person=: people's ids.
  person: string[];
  deleter: CallDeleter;
  // What a note can be linked to (its sheet).
  choices: NoteLinkChoices;
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
    link: withProject ? filterParamOf(link) : null,
    person: filterParamOf(person),
  };
  const matches = (row: NoteRow) =>
    (!withProject || matchesAny(link, linkValueOf(row))) &&
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
  const filtering = link.length > 0 || person.length > 0;
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
        choices={choices}
        filters={
          <UrlFilters
            path={path}
            params={{ tab: current === "all" ? null : current }}
            groups={filterGroups(ofTab, link, person, withProject)}
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

// What some row of the tab is linked to, what is linked to nothing last;
// the people in them (members of a call, authors of a note).
function filterGroups(
  rows: NoteRow[],
  link: string[],
  person: string[],
  withProject: boolean,
): UrlFilterGroup[] {
  const t = fr.notes;
  const links = new Map<string, string>();
  const people = new Map<string, string>();
  for (const row of rows) {
    const option = linkOptionOf(row);
    if (option) links.set(...option);
    for (const p of row.kind === "call" ? row.people : [row.author])
      people.set(p.personId, p.name);
  }
  const hasInternal = rows.some((row) => linkValueOf(row) === INTERNAL);
  const hasTeam = rows.some((row) => linkValueOf(row) === TEAM);
  const groups: UrlFilterGroup[] = [];
  if (withProject)
    groups.push({
      key: "link",
      label: t.filters.link,
      allLabel: t.filters.allLinks,
      options: [
        ...optionsByName(links),
        ...(hasInternal ? [{ value: INTERNAL, label: t.internalCall }] : []),
        ...(hasTeam ? [{ value: TEAM, label: t.teamNote }] : []),
      ],
      current: link,
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
