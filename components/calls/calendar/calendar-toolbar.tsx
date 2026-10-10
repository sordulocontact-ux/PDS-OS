import { IconChevronLeft, IconChevronRight } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { ViewToggle } from "@/components/ui/view-toggle";
import {
  CALENDAR_MODES,
  type CalendarMode,
  type CalendarPeriod,
} from "@/lib/calls/calendar";
import { fr } from "@/lib/i18n/fr";

const utc = (day: string) => new Date(`${day}T00:00:00Z`);
const rangeDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthDate = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** « 5–11 octobre 2026 », « octobre 2026 ». */
export function periodLabel(period: CalendarPeriod): string {
  if (period.mode === "month") return monthDate.format(utc(period.date));
  return rangeDate.formatRange(
    utc(period.days[0]),
    utc(period.days[period.days.length - 1]),
  );
}

/**
 * The calendar's bar, as in Teams: « Aujourd'hui », previous and next
 * period, what is shown, and the period (Semaine, Mois). Every choice is a link: the URL holds the view.
 */
export function CalendarToolbar({
  period,
  hrefOf,
}: {
  period: CalendarPeriod;
  // The calendar's URL for a mode and a date (null: today).
  hrefOf: (mode: CalendarMode, date: string | null) => string;
}) {
  const t = fr.calls.calendar;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ViewLink
        href={hrefOf(period.mode, null)}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {t.today}
      </ViewLink>
      <ViewLink
        href={hrefOf(period.mode, period.previous)}
        aria-label={t.previous[period.mode]}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <IconChevronLeft aria-hidden />
      </ViewLink>
      <ViewLink
        href={hrefOf(period.mode, period.next)}
        aria-label={t.next[period.mode]}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <IconChevronRight aria-hidden />
      </ViewLink>
      <h2 className="text-lg font-semibold first-letter:uppercase">
        {periodLabel(period)}
      </h2>
      <div className="ml-auto">
        <ViewToggle
          label={t.modes.label}
          options={CALENDAR_MODES.map((mode) => ({
            href: hrefOf(mode, period.date),
            label: t.modes[mode],
            current: mode === period.mode,
          }))}
        />
      </div>
    </div>
  );
}
