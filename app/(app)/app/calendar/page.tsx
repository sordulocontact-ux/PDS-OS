import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { CalendarAgenda } from "@/components/calendar/calendar-agenda";
import { CalendarMonth } from "@/components/calendar/calendar-board";
import { CallsCalendar } from "@/components/calls/calendar/calls-calendar";
import { MeetingComposerProvider } from "@/components/calls/new-meeting-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { CalendarToolbar } from "@/components/ui/calendar-toolbar";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { ViewToggle } from "@/components/ui/view-toggle";
import type { Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadCalendar } from "@/lib/calendar/queries";
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
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.calendar.page.title} · ${fr.app.name}`,
};

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
  const access = await requireApproved();
  const t = fr.calendar.page;
  const hrefOf = (
    mode: CalendarMode,
    date: string | null,
    voir: string | null = mine ? MINE : null,
  ) =>
    viewHref(routes.calendar, {
      mode: mode === "month" ? null : mode,
      date: date === today ? null : date,
      voir,
    });

  return (
    <SectionFrame
      title={t.title}
      description={t.description}
      action={
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
    >
      <section className="flex flex-col gap-3">
        <CalendarToolbar
          period={period}
          hrefOf={(mode, date) => hrefOf(mode, date)}
        />
        <Suspense
          key={`${period.mode}|${period.date}|${mine}`}
          fallback={
            <LoadingRegion label={fr.auth.common.loading}>
              <Skeleton className="h-[36rem] rounded-xl" />
            </LoadingRegion>
          }
        >
          <CalendarBody
            access={access}
            period={period}
            now={now}
            mine={mine}
            weekHref={(day) => hrefOf("week", day)}
          />
        </Suspense>
      </section>
    </SectionFrame>
  );
}

// The period's dates, streamed under the bar (every project's journeys are
// read for the steps' due dates).
async function CalendarBody({
  access,
  period,
  now,
  mine,
  weekHref,
}: {
  access: Access;
  period: CalendarPeriod;
  now: { day: string; minute: number };
  mine: boolean;
  weekHref: (day: string) => string;
}) {
  const t = fr.calendar.page;
  const today = now.day;
  // The meeting form is read beside the dates, not after them.
  const [{ items: all, calls, error }, meeting] = await allInOrder([
    loadCalendar(period, access),
    period.mode === "week" ? loadMeetingFormData(access, new Date()) : null,
  ]);
  const items = mine ? all.filter((item) => item.mine) : all;
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
      meeting && (
        <MeetingComposerProvider data={meeting}>
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
        </MeetingComposerProvider>
      )
    );
  return (
    <>
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
    </>
  );
}
