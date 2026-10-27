import { ViewLink } from "@/components/ui/view-link";
import type { CalendarItem } from "@/lib/calendar/items";
import { calendar } from "@/lib/i18n/fr/calendar";
import { cn } from "@/lib/utils";

import { CalendarEntry, longDayOf } from "./calendar-item";

const fr = { calendar };

// Dates listed in a month's day before « n autres ».
const SHOWN = 3;

const weekday = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  timeZone: "UTC",
});

const focusRing =
  "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** The day's number, ink on today; in a month, opens the day's week. */
function DayNumber({
  day,
  today,
  muted = false,
  href,
}: {
  day: string;
  today: string;
  muted?: boolean;
  href?: string;
}) {
  const className = cn(
    "flex size-7 items-center justify-center self-start rounded-[var(--radius-circle)] text-[length:var(--type-micro)] font-semibold tabular-nums",
    muted && "text-muted-foreground",
    day === today && "bg-foreground text-background",
  );
  if (!href)
    return (
      <span
        aria-current={day === today ? "date" : undefined}
        className={className}
      >
        {Number(day.slice(8))}
      </span>
    );
  return (
    <ViewLink
      href={href}
      aria-label={longDayOf(day)}
      aria-current={day === today ? "date" : undefined}
      className={cn(
        className,
        focusRing,
        day !== today &&
          "[@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]",
      )}
    >
      {Number(day.slice(8))}
    </ViewLink>
  );
}

type BoardProps = {
  days: string[];
  items: CalendarItem[];
  today: string;
};

const frame =
  "overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card";

function Weekdays({ days }: { days: string[] }) {
  return (
    <div
      aria-hidden
      className="grid grid-cols-7 border-b border-[color:var(--border-hairline)]"
    >
      {days.slice(0, 7).map((day) => (
        <span
          key={day}
          className="py-2 text-center text-[length:var(--type-micro)] text-muted-foreground first-letter:uppercase"
        >
          {weekday.format(new Date(`${day}T00:00:00Z`))}
        </span>
      ))}
    </div>
  );
}

/**
 * The month as in the Calls: whole weeks, the other months' days quieter,
 * three dates a day then « n autres », which opens the day's week.
 */
export function CalendarMonth({
  days,
  month,
  items,
  today,
  weekHref,
}: BoardProps & {
  // "YYYY-MM": the month read.
  month: string;
  // The week view around a day (its number, « n autres »).
  weekHref: (day: string) => string;
}) {
  const t = fr.calendar.page;
  return (
    <div className={frame}>
      <Weekdays days={days} />
      <ol className="grid grid-cols-7">
        {days.map((day) => {
          const own = items.filter((item) => item.day === day);
          const outside = !day.startsWith(month);
          return (
            <li
              key={day}
              className={cn(
                "flex min-h-28 min-w-0 flex-col gap-1 border-t border-l border-[color:var(--border-hairline)] p-1.5 [&:nth-child(-n+7)]:border-t-0 [&:nth-child(7n+1)]:border-l-0",
                outside && "bg-[var(--surface-soft)]",
              )}
            >
              <DayNumber
                day={day}
                today={today}
                muted={outside}
                href={weekHref(day)}
              />
              {own.slice(0, SHOWN).map((item) => (
                <CalendarEntry
                  key={item.key}
                  item={item}
                  past={day < today}
                  compact
                />
              ))}
              {own.length > SHOWN && (
                <ViewLink
                  href={weekHref(day)}
                  className={cn(
                    "self-start rounded-sm px-1 text-[length:var(--type-micro)] font-medium text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
                    focusRing,
                  )}
                >
                  {t.more(own.length - SHOWN)}
                </ViewLink>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The week: seven columns, every date of each day in reading order. */
export function CalendarWeek({ days, items, today }: BoardProps) {
  return (
    <div className={frame}>
      <Weekdays days={days} />
      <ol className="grid grid-cols-7">
        {days.map((day) => (
          <li
            key={day}
            className={cn(
              "flex min-h-72 min-w-0 flex-col gap-1.5 border-l border-[color:var(--border-hairline)] p-1.5 first:border-l-0",
              day === today && "bg-[var(--surface-soft)]",
            )}
          >
            <DayNumber day={day} today={today} />
            {items
              .filter((item) => item.day === day)
              .map((item) => (
                <CalendarEntry key={item.key} item={item} past={day < today} />
              ))}
          </li>
        ))}
      </ol>
    </div>
  );
}
