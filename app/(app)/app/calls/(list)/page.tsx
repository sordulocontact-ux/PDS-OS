import { IconFolderOpen, IconPhone } from "nucleo-sharp-essential";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { CallsCalendar } from "@/components/calls/calendar/calls-calendar";
import { CallsListView } from "@/components/calls/calls-list-view";
import {
  MeetingComposerProvider,
  NewMeetingButton,
} from "@/components/calls/new-meeting-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { CalendarToolbar } from "@/components/ui/calendar-toolbar";
import { ViewToggle } from "@/components/ui/view-toggle";
import { callDeleter } from "@/lib/calls/delete-rule";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { placeCalls } from "@/lib/calls/calendar";
import { asCallView } from "@/lib/calls/format";
import { loadMeetingFormData } from "@/lib/calls/invite";
import { listAllCalls, type CallListItem } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { filterParam } from "@/lib/ui/filter-options";
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

// ?display= of the calendar; the list is the page's default.
const CALENDAR = "calendar";

async function loadCalls(range?: {
  from: Date;
  to: Date;
}): Promise<CallListItem[] | null> {
  try {
    const calls = await listAllCalls(await createClient(), { range });
    // Opened here, the navigation staying on Calls (lib/calls/door.ts).
    return calls.map((call) => ({ ...call, href: routes.call(call.id) }));
  } catch (error) {
    // Next's own signals (dynamic rendering, redirects) are not failures.
    unstable_rethrow(error);
    console.error(error);
    return null;
  }
}

/**
 * Every call one may see, as a list by default (Tous / À venir / Passés, an
 * instant search and the project filter; Sacha, 01/11/2026) or as a calendar
 * (?display=calendar, Teams: Semaine, Mois; ?mode=…&date=YYYY-MM-DD) — and
 * nothing else: a list page is only a list (docs/VISION-UX.md, proto
 * `docs/protos/pages.html`). Every call opens here, even a project's
 * (lib/calls/door.ts).
 */
export default async function CallsPage({
  searchParams,
}: PageProps<"/app/calls">) {
  const params = await searchParams;
  const now = new Date();
  const list = params.display !== CALENDAR;
  const today = parisPlace(now);
  const period = periodOf(
    asCalendarMode(params.mode),
    asDay(params.date) ?? today.day,
  );
  const approved = requireApproved();
  const [access, calls, composer] = await allInOrder([
    approved,
    loadCalls(list ? undefined : periodRange(period)),
    approved.then((access) => loadMeetingFormData(access, now)),
  ]);
  const t = fr.calls.all;
  const calendarHref = (mode: CalendarMode, date: string | null) =>
    viewHref(routes.calls, {
      display: CALENDAR,
      mode: mode === "week" ? null : mode,
      date: date === today.day ? null : date,
    });
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
                label: fr.calls.calendar.displays.list,
                current: list,
              },
              {
                href: calendarHref("week", null),
                label: fr.calls.calendar.displays.calendar,
                current: !list,
              },
            ]}
          />
          <NewMeetingButton />
        </div>
      }
    />
  );

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

  return (
    <MeetingComposerProvider data={composer}>
      <PageContainer>
        {header}
        <CallsListView
          calls={calls}
          now={now}
          door={{ kind: "calls" }}
          view={asCallView(params.view)}
          project={filterParam(params.project)}
          deleter={callDeleter(access)}
          empty={
            <EmptyState
              icon={IconPhone}
              title={t.emptyTitle}
              body={t.emptyBody}
              action={
                <Link
                  href={routes.projects}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <ButtonRoll>
                    <IconFolderOpen aria-hidden data-icon="inline-start" />
                    {t.openProjects}
                  </ButtonRoll>
                </Link>
              }
            />
          }
        />
      </PageContainer>
    </MeetingComposerProvider>
  );
}
