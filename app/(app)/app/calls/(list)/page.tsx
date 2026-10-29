import { IconFolderOpen, IconPhone } from "nucleo-sharp-essential";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { AllCallsList } from "@/components/calls/all-calls-list";
import { CallsCalendar } from "@/components/calls/calendar/calls-calendar";
import {
  MeetingComposerProvider,
  NewMeetingButton,
} from "@/components/calls/new-meeting-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { CalendarToolbar } from "@/components/ui/calendar-toolbar";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters, type UrlFilterGroup } from "@/components/ui/url-filters";
import { ViewToggle } from "@/components/ui/view-toggle";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { placeCalls } from "@/lib/calls/calendar";
import {
  asCallView,
  callViewOf,
  CALL_VIEWS,
  nextRoundHourInput,
} from "@/lib/calls/format";
import { loadCallContacts } from "@/lib/calls/invite";
import { listAllCalls, type CallListItem } from "@/lib/calls/queries";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { googleMeetConfigured } from "@/lib/integrations/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { filterParam, optionsByName } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";
import {
  asCalendarMode,
  asDay,
  parisPlace,
  periodOf,
  periodRange,
  type CalendarMode,
} from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.calls.all.title} · ${fr.app.name}` };

// The project filter's value for the meetings outside any project.
const INTERNAL = "internal";

type CallFilters = { project: string | null };

const matches = (call: CallListItem, filters: CallFilters) =>
  !filters.project || (call.projectId ?? INTERNAL) === filters.project;

async function loadCalls(range?: {
  from: Date;
  to: Date;
}): Promise<CallListItem[] | null> {
  try {
    return await listAllCalls(await createClient(), range);
  } catch (error) {
    // Next's own signals (dynamic rendering, redirects) are not failures.
    unstable_rethrow(error);
    console.error(error);
    return null;
  }
}

/**
 * Every call one may see, as a calendar by default (Teams: Semaine, Mois; ?mode=…&date=YYYY-MM-DD) or as a list
 * (?display=list, Tous / À venir / Passés, an instant search and the
 * project filter) — and nothing else: a list page is only a list
 * (docs/VISION-UX.md, proto `docs/protos/pages.html`).
 */
export default async function CallsPage({
  searchParams,
}: PageProps<"/app/calls">) {
  const params = await searchParams;
  const now = new Date();
  const list = params.display === "list";
  const today = parisPlace(now);
  const period = periodOf(
    asCalendarMode(params.mode),
    asDay(params.date) ?? today.day,
  );
  const [access, calls, contacts] = await allInOrder([
    requireApproved(),
    loadCalls(list ? undefined : periodRange(period)),
    loadCallContacts(),
  ]);
  const t = fr.calls.all;
  const view = asCallView(params.view);
  const members = (await loadMembers(access)).filter(
    (member) => member.personId !== access.personId,
  );
  const calendarHref = (mode: CalendarMode, date: string | null) =>
    viewHref(routes.calls, {
      mode: mode === "week" ? null : mode,
      date: date === today.day ? null : date,
    });
  const filters: CallFilters = {
    project: filterParam(params.project),
  };
  const filtering = Object.values(filters).some((value) => value !== null);
  const listHref = (value: string | null, kept: Partial<CallFilters> = {}) =>
    viewHref(routes.calls, { ...kept, display: "list", view: value });
  const header = (
    <PageHeader
      title={t.title}
      description={t.description}
      action={
        <div className="flex flex-wrap items-center gap-3">
          <ViewToggle
            label={fr.calls.calendar.displays.label}
            options={[
              {
                href: routes.calls,
                label: fr.calls.calendar.displays.calendar,
                current: !list,
              },
              {
                href: listHref(null),
                label: fr.calls.calendar.displays.list,
                current: list,
              },
            ]}
          />
          <NewMeetingButton />
        </div>
      }
    />
  );
  const composer = {
    members,
    contacts,
    googleMeet: googleMeetConfigured(),
    defaultOccurredAt: nextRoundHourInput(now),
  };

  if (!calls) {
    return (
      <MeetingComposerProvider data={composer}>
        <PageContainer>
          {header}
          <FormMessage kind="error">{t.loadError}</FormMessage>
        </PageContainer>
      </MeetingComposerProvider>
    );
  }

  if (!list) {
    return (
      <MeetingComposerProvider data={composer}>
        <PageContainer>
          {header}
          <section className="flex flex-col gap-3">
            <CalendarToolbar period={period} hrefOf={calendarHref} />
            <CallsCalendar
              mode={period.mode}
              days={period.days}
              month={period.date.slice(0, 7)}
              events={placeCalls(calls, now, access.personId)}
              today={today}
              weekHrefs={Object.fromEntries(
                period.days.map((day) => [day, calendarHref("week", day)]),
              )}
            />
          </section>
        </PageContainer>
      </MeetingComposerProvider>
    );
  }

  // The tabs count what the filters keep; the filters offer what the tab
  // holds.
  const filtered = calls.filter((call) => matches(call, filters));
  const counts = { upcoming: 0, past: 0 };
  for (const call of filtered) counts[callViewOf(call, now)] += 1;
  const ofView = view
    ? calls.filter((call) => callViewOf(call, now) === view)
    : calls;
  // Planned calls read soonest first; the others, latest first.
  const shown = view
    ? filtered.filter((call) => callViewOf(call, now) === view)
    : filtered;
  if (view === "upcoming") shown.reverse();

  return (
    <MeetingComposerProvider data={composer}>
      <PageContainer>
        {header}
        {calls.length === 0 ? (
          <EmptyState
            icon={IconPhone}
            title={t.emptyTitle}
            body={t.emptyBody}
            action={
              <Link
                href={routes.projects}
                className={buttonVariants({ variant: "outline" })}
              >
                <IconFolderOpen aria-hidden data-icon="inline-start" />
                {t.openProjects}
              </Link>
            }
          />
        ) : (
          <DataTableViews
            label={t.views.label}
            views={[
              {
                href: listHref(null, filters),
                label: t.views.all,
                count: filtered.length,
                current: view === null,
              },
              ...CALL_VIEWS.map((value) => ({
                href: listHref(value, filters),
                label: t.views[value],
                count: counts[value],
                current: view === value,
              })),
            ]}
          >
            <AllCallsList
              calls={shown}
              now={now}
              filters={
                <UrlFilters
                  path={routes.calls}
                  params={{ display: "list", view }}
                  groups={filterGroups(ofView, filters)}
                />
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
        )}
      </PageContainer>
    </MeetingComposerProvider>
  );
}

// The projects some call of the tab belongs to; the meetings outside any
// project last.
function filterGroups(
  calls: CallListItem[],
  current: CallFilters,
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
      current: current.project,
    },
  ];
}
