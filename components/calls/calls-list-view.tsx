import { IconPhone } from "nucleo-sharp-essential";

import { CallsList } from "@/components/calls/calls-list";
import { EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters, type UrlFilterGroup } from "@/components/ui/url-filters";
import { callsHref, type CallDoor } from "@/lib/calls/door";
import { callViewOf, CALL_VIEWS, type CallView } from "@/lib/calls/format";
import type { CallListItem } from "@/lib/calls/queries";
import { calls as callsFr } from "@/lib/i18n/fr/calls";
import { optionsByName } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";

const fr = { calls: callsFr };

// The project filter's value for the meetings outside any project.
const INTERNAL = "internal";

/**
 * A door's list of calls (lib/calls/door.ts), the same in Calls and in a
 * project: the tabs Tous / À venir / Passés with what the filters keep
 * (?view=), the search and — in Calls only — the project filter
 * (?project=), the rows (CallsTable), and the empty states. `empty`: what
 * stands for a door without any call at all.
 */
export function CallsListView({
  calls,
  now,
  door,
  view,
  project,
  deletable,
  empty,
}: {
  calls: CallListItem[];
  now: Date;
  door: CallDoor;
  view: CallView | null;
  // ?project= of Calls: a project's id, or « internal ».
  project: string | null;
  deletable: boolean;
  empty: React.ReactNode;
}) {
  if (calls.length === 0) return empty;
  const t = fr.calls.all;
  const path = callsHref(door);
  const withFilter = door.kind === "calls";
  const kept = withFilter ? { project } : {};
  const matches = (call: CallListItem) =>
    !withFilter || !project || (call.projectId ?? INTERNAL) === project;

  // The tabs count what the filters keep; the filters offer what the tab
  // holds.
  const filtered = calls.filter(matches);
  const counts = { upcoming: 0, past: 0 };
  for (const call of filtered) counts[callViewOf(call, now)] += 1;
  const ofView = view
    ? calls.filter((call) => callViewOf(call, now) === view)
    : calls;
  const shown = view
    ? filtered.filter((call) => callViewOf(call, now) === view)
    : filtered;
  const filtering = withFilter && project !== null;
  const listHref = (value: CallView | null) =>
    viewHref(path, { ...kept, view: value });

  return (
    <DataTableViews
      label={t.views.label}
      views={[
        {
          href: listHref(null),
          label: t.views.all,
          count: filtered.length,
          current: view === null,
        },
        ...CALL_VIEWS.map((value) => ({
          href: listHref(value),
          label: t.views[value],
          count: counts[value],
          current: view === value,
        })),
      ]}
    >
      <CallsList
        calls={shown}
        now={now}
        door={door}
        deletable={deletable}
        filters={
          withFilter && (
            <UrlFilters
              path={path}
              params={{ view }}
              groups={projectFilter(ofView, project)}
            />
          )
        }
        empty={
          <EmptyState
            icon={IconPhone}
            title={
              filtering
                ? t.filtersEmpty
                : view === "upcoming"
                  ? t.emptyUpcomingTitle
                  : t.emptyPastTitle
            }
            body={filtering ? t.filtersEmptyBody : t.emptyViewBody}
          />
        }
      />
    </DataTableViews>
  );
}

// The projects some call of the tab belongs to; the meetings outside any
// project last.
function projectFilter(
  calls: CallListItem[],
  current: string | null,
): UrlFilterGroup[] {
  const t = fr.calls.all;
  const projects = new Map<string, string>();
  for (const call of calls)
    if (call.projectId && call.projectTitle)
      projects.set(call.projectId, call.projectTitle);
  return [
    {
      key: "project",
      label: t.filters.projectLabel,
      allLabel: t.filters.projectAll,
      options: [
        ...optionsByName(projects),
        ...(calls.some((call) => !call.projectId)
          ? [{ value: INTERNAL, label: t.internal }]
          : []),
      ],
      current,
    },
  ];
}
