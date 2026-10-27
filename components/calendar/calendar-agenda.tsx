import type { CalendarItem } from "@/lib/calendar/items";
import { calendar } from "@/lib/i18n/fr/calendar";
import { cn } from "@/lib/utils";

import { CalendarEntry, longDayOf } from "./calendar-item";

const fr = { calendar };

/**
 * The period on a phone, as the Calls' agenda: one heading per day, its
 * dates in reading order. `skipEmpty`: a month lists only the days that
 * have some.
 */
export function CalendarAgenda({
  days,
  items,
  today,
  skipEmpty,
}: {
  days: string[];
  items: CalendarItem[];
  today: string;
  skipEmpty: boolean;
}) {
  const t = fr.calendar.page;
  const listed = days
    .map((day) => ({ day, items: items.filter((item) => item.day === day) }))
    .filter((d) => !skipEmpty || d.items.length > 0);

  return (
    <ol className="flex flex-col gap-5">
      {listed.map(({ day, items: own }) => (
        <li key={day} className="flex flex-col gap-2">
          <h3
            aria-current={day === today ? "date" : undefined}
            className={cn(
              "text-[length:var(--type-body-sm)] font-semibold first-letter:uppercase",
              day !== today && "text-muted-foreground",
            )}
          >
            {longDayOf(day)}
          </h3>
          {own.length === 0 ? (
            <p className="text-[length:var(--type-body-sm)] text-muted-foreground">
              {t.dayEmpty}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {own.map((item) => (
                <li key={item.key} className="flex flex-col">
                  <CalendarEntry item={item} past={day < today} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
