import { IconChevronLeft, IconChevronRight } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { calendar } from "@/lib/i18n/fr/calendar";
import { cn } from "@/lib/utils";

const fr = { calendar };

const monthName = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * The small month beside the calendar (xl and up, Accordee's model): the
 * weekday letters, the day numbers, a dot under a day with at least one
 * date, today marked, the neighbouring months. A day opens its week.
 */
export function MiniMonth({
  month,
  days,
  dotDays,
  today,
  weekHref,
  previousHref,
  nextHref,
}: {
  // "YYYY-MM": the month drawn.
  month: string;
  // Whole weeks around it.
  days: string[];
  dotDays: ReadonlySet<string>;
  today: string;
  weekHref: (day: string) => string;
  previousHref: string;
  nextHref: string;
}) {
  const t = fr.calendar.side;
  return (
    <section
      aria-label={t.miniMonth}
      className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-hairline)] bg-card p-3"
    >
      <div className="flex items-center gap-1">
        <h2 className="flex-1 pl-1 text-sm font-semibold first-letter:uppercase">
          {monthName.format(new Date(`${month}-01T00:00:00Z`))}
        </h2>
        <ViewLink
          href={previousHref}
          aria-label={t.previousMonth}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <IconChevronLeft aria-hidden />
        </ViewLink>
        <ViewLink
          href={nextHref}
          aria-label={t.nextMonth}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <IconChevronRight aria-hidden />
        </ViewLink>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {t.weekdays.map((letter, index) => (
          <span
            key={index}
            aria-hidden
            className="py-1 text-[length:var(--type-micro)] text-muted-foreground"
          >
            {letter}
          </span>
        ))}
        {days.map((day) => {
          const outside = !day.startsWith(month);
          const isToday = day === today;
          return (
            <ViewLink
              key={day}
              href={weekHref(day)}
              aria-label={longDay.format(new Date(`${day}T00:00:00Z`))}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "relative mx-auto flex size-8 items-center justify-center rounded-[var(--radius-circle)] text-[length:var(--type-micro)] tabular-nums focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                outside && "text-muted-foreground",
                isToday
                  ? "bg-foreground font-semibold text-background"
                  : "[@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]",
              )}
            >
              {Number(day.slice(8))}
              {dotDays.has(day) && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bottom-0.5 size-1 rounded-[var(--radius-circle)]",
                    isToday ? "bg-background" : "bg-foreground",
                  )}
                />
              )}
            </ViewLink>
          );
        })}
      </div>
    </section>
  );
}
