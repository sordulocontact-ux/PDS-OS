import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { CalendarAgenda } from "@/components/calendar/calendar-agenda";
import { CalendarMonth } from "@/components/calendar/calendar-board";
import { CalendarSide } from "@/components/calendar/calendar-side";
import { CallsCalendar } from "@/components/calls/calendar/calls-calendar";
import {
  MeetingComposerProvider,
  NewMeetingButton,
} from "@/components/calls/new-meeting-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { CalendarToolbar } from "@/components/ui/calendar-toolbar";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { ViewToggle } from "@/components/ui/view-toggle";
import type { Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadCalendar, loadUpcomingCalls } from "@/lib/calendar/queries";
import { placeCalls } from "@/lib/calls/calendar";
import { loadMeetingFormData } from "@/lib/calls/invite";
import { fr } from "@/lib/i18n/fr";
import { viewHref } from "@/lib/ui/view-href";
import {
  asCalendarMode,
  asDay,
  parisPlace,
  periodOf,
  type CalendarMode,
  type CalendarPeriod,
} from "@/lib/utils/calendar-period";
import { cn } from "@/lib/utils";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.calendar.page.title} · ${fr.app.name}`,
};

// "YYYY-MM" from the URL (?mini=), or null.
const asMonth = (value: unknown) =>
  typeof value === "string" && asDay(`${value}-01`) ? value : null;

// « À vous »: only what asks the viewer a gesture (?voir=mine).
const MINE = "mine";

/**
 * The Calendrier (docs/ARCHITECTURE.md § 8, « Calendrier »): the dates PDS OS already
 * knows in every project one sees, the month by default (?mode=week for the
 * week, ?date=YYYY-MM-DD to move), « Tout » or « À vous ». Each date opens
 * where it is decided; the week shows the hours, as in Teams, where a free
 * slot opens « Nouvelle réunion » and one's calls move. Phones read the
 * period as an agenda.
 */
export default async function CalendarPage({
  searchParams,
}: PageProps<"/app/calendar">) {
  const params = await searchParams;
  const now = parisPlace(new Date());
  const today = now.day;
  const period = periodOf(
    asCalendarMode(params.mode, "month"),
    asDay(params.date) ?? today,
  );
  const mine = params.voir === MINE;
  const approved = requireApproved();
  const [access, meeting] = await allInOrder([
    approved,
    approved.then((access) => loadMeetingFormData(access, new Date())),
  ]);
  const t = fr.calendar.page;
  const hrefOf = (
    mode: CalendarMode,
    date: string | null,
    voir: string | null = mine ? MINE : null,
    mini: string | null = null,
  ) =>
    viewHref(routes.calendar, {
      mode: mode === "month" ? null : mode,
      date: date === today ? null : date,
      voir,
      mini,
    });
  // The mini-month: the period's month, unless the column moved to another.
  const miniMonth = asMonth(params.mini);
  const mini = periodOf("month", miniMonth ? `${miniMonth}-01` : period.date);

  return (
    <MeetingComposerProvider data={meeting}>
      <SectionFrame title={t.title} description={t.description}>
        <section className="flex flex-col gap-3">
          <CalendarToolbar
            period={period}
            hrefOf={(mode, date) => hrefOf(mode, date)}
            action={<NewMeetingButton label={fr.calendar.side.newCall} />}
            views={
              <ViewToggle
                label={t.views.label}
                options={[
                  {
                    href: hrefOf(period.mode, period.date, null),
                    label: t.views.all,
                    current: !mine,
                  },
                  {
                    href: hrefOf(period.mode, period.date, MINE),
                    label: t.views.mine,
                    current: mine,
                  },
                ]}
              />
            }
          />
          <Suspense
            key={`${period.mode}|${period.date}|${mine}|${mini.date}`}
            fallback={
              <LoadingRegion label={fr.auth.common.loading}>
                <Skeleton className="h-[36rem] rounded-xl" />
              </LoadingRegion>
            }
          >
            <CalendarBody
              access={access}
              period={period}
              mini={mini}
              now={now}
              mine={mine}
              weekHref={(day) => hrefOf("week", day)}
              miniHref={(date) =>
                hrefOf(period.mode, period.date, undefined, date.slice(0, 7))
              }
            />
          </Suspense>
        </section>
      </SectionFrame>
    </MeetingComposerProvider>
  );
}

// The period's dates, streamed under the bar (every project's journeys are
// read for the steps' due dates), with the right-hand column from xl up: the
// mini-month's dots and the next calls are read beside them.
async function CalendarBody({
  access,
  period,
  mini,
  now,
  mine,
  weekHref,
  miniHref,
}: {
  access: Access;
  period: CalendarPeriod;
  mini: CalendarPeriod;
  now: { day: string; minute: number };
  mine: boolean;
  weekHref: (day: string) => string;
  miniHref: (date: string) => string;
}) {
  const t = fr.calendar.page;
  const today = now.day;
  // The mini-month shows the period's own month: its dates are already read.
  const sameMonth =
    period.mode === "month" &&
    period.date.slice(0, 7) === mini.date.slice(0, 7);
  const [{ items: all, calls, error }, miniData, upcoming] = await allInOrder([
    loadCalendar(period, access),
    sameMonth ? null : loadCalendar(mini, access),
    loadUpcomingCalls(access, new Date(), mine),
  ]);
  const items = mine ? all.filter((item) => item.mine) : all;
  const miniAll = miniData ? miniData.items : all;
  const miniItems = mine ? miniAll.filter((item) => item.mine) : miniAll;
  // The calls the dates kept (« À vous », an archived project's left out).
  const shown = new Set(
    items.filter((item) => item.kind === "call").map((item) => item.key),
  );
  const board =
    period.mode === "month" ? (
      <CalendarMonth
        days={period.days}
        month={period.date.slice(0, 7)}
        items={items}
        today={today}
        weekHref={weekHref}
      />
    ) : (
      <CallsCalendar
        mode="week"
        days={period.days}
        month={period.date.slice(0, 7)}
        events={placeCalls(
          calls.filter((call) => shown.has(`call|${call.id}`)),
          new Date(),
          access.personId,
        )}
        items={items.filter((item) => item.kind !== "call")}
        today={now}
      />
    );
  // The right-hand column: the mini-month beside a week, the next calls.
  const side = period.mode === "week" || upcoming.length > 0;
  return (
    <div
      className={cn(
        side &&
          "xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-6",
      )}
    >
      <div className="flex min-w-0 flex-col gap-3">
        {error && <FormMessage kind="error">{t.loadError}</FormMessage>}
        {items.length === 0 && !error && (
          <EmptyNote>{mine ? t.empty.mine : t.empty.all}</EmptyNote>
        )}
        <div className="hidden md:block">{board}</div>
        <div className="md:hidden">
          <CalendarAgenda
            days={period.days}
            items={items}
            today={today}
            skipEmpty={period.mode === "month"}
          />
        </div>
      </div>
      {side && (
        <CalendarSide
          mini={mini}
          items={miniItems}
          upcoming={upcoming}
          today={today}
          weekHref={weekHref}
          monthHref={miniHref}
          showMonth={period.mode === "week"}
        />
      )}
    </div>
  );
}
