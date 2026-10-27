import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { CalendarAgenda } from "@/components/calendar/calendar-agenda";
import {
  CalendarMonth,
  CalendarWeek,
} from "@/components/calendar/calendar-board";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { CalendarToolbar } from "@/components/ui/calendar-toolbar";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { ViewToggle } from "@/components/ui/view-toggle";
import type { Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadCalendar } from "@/lib/calendar/queries";
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

export const metadata = {
  title: `${fr.calendar.page.title} · ${fr.app.name}`,
};

// « À vous »: only what asks the viewer a gesture (?voir=mine).
const MINE = "mine";

/**
 * The Calendrier (docs/ARCHITECTURE.md § 8, « Calendrier »): the dates PDS OS already
 * knows in every project one sees, the month by default (?mode=week for the
 * week, ?date=YYYY-MM-DD to move), « Tout » or « À vous ». Read only: each
 * date opens where it is decided. Phones read the period as an agenda.
 */
export default async function CalendarPage({
  searchParams,
}: PageProps<"/app/calendar">) {
  const params = await searchParams;
  const today = parisPlace(new Date()).day;
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
    <PageContainer>
      <PageHeader
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
      />
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
            today={today}
            mine={mine}
            weekHref={(day) => hrefOf("week", day)}
          />
        </Suspense>
      </section>
    </PageContainer>
  );
}

// The period's dates, streamed under the bar (every project's journeys are
// read for the steps' due dates).
async function CalendarBody({
  access,
  period,
  today,
  mine,
  weekHref,
}: {
  access: Access;
  period: CalendarPeriod;
  today: string;
  mine: boolean;
  weekHref: (day: string) => string;
}) {
  const t = fr.calendar.page;
  const { items: all, error } = await loadCalendar(period, access);
  const items = mine ? all.filter((item) => item.mine) : all;
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
      <CalendarWeek days={period.days} items={items} today={today} />
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
