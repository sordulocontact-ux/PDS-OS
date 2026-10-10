import { IconFolderOpen, IconPhone } from "nucleo-sharp-essential";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { AllCallsTable } from "@/components/calls/all-calls-table";
import { CalendarToolbar } from "@/components/calls/calendar/calendar-toolbar";
import { CallsCalendar } from "@/components/calls/calendar/calls-calendar";
import {
  MeetingComposerProvider,
  NewMeetingButton,
} from "@/components/calls/new-meeting-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DataTableViews } from "@/components/ui/data-table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  asCalendarMode,
  asDay,
  parisPlace,
  periodOf,
  periodRange,
  placeCalls,
  type CalendarMode,
} from "@/lib/calls/calendar";
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
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.calls.all.title} · ${fr.app.name}` };

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
 * (?display=list, Tous / À venir / Passés).
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
  const listHref = (value: string | null) =>
    viewHref(routes.calls, { display: "list", view: value });
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

  const counts = { upcoming: 0, past: 0 };
  for (const call of calls) counts[callViewOf(call, now)] += 1;
  // Planned calls read soonest first; the others, latest first.
  const shown = view
    ? calls.filter((call) => callViewOf(call, now) === view)
    : calls;
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
                href: listHref(null),
                label: t.views.all,
                count: calls.length,
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
            {shown.length === 0 ? (
              <EmptyState
                icon={IconPhone}
                title={
                  view === "upcoming" ? t.emptyUpcomingTitle : t.emptyPastTitle
                }
                body={t.emptyViewBody}
              />
            ) : (
              <AllCallsTable calls={shown} now={now} />
            )}
          </DataTableViews>
        )}
      </PageContainer>
    </MeetingComposerProvider>
  );
}
