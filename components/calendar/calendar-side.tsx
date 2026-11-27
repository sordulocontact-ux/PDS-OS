import { MiniMonth } from "@/components/calendar/mini-month";
import { UpcomingCalls } from "@/components/calendar/upcoming-calls";
import type { CalendarItem } from "@/lib/calendar/items";
import type { CallListItem } from "@/lib/calls/queries";
import type { CalendarPeriod } from "@/lib/utils/calendar-period";

/**
 * The calendar's right-hand column, from xl up (hidden below, nothing changes
 * on a phone): the mini-month, then the next calls.
 */
export function CalendarSide({
  mini,
  items,
  upcoming,
  today,
  weekHref,
  monthHref,
  showMonth,
}: {
  // The month drawn (its days are whole weeks).
  mini: CalendarPeriod;
  // The dates of that month, for the dots.
  items: CalendarItem[];
  upcoming: CallListItem[];
  today: string;
  weekHref: (day: string) => string;
  // The calendar's URL showing another month in the mini-month ("YYYY-MM-01").
  monthHref: (date: string) => string;
  // Only beside a week: beside the month it would draw the same month twice.
  showMonth: boolean;
}) {
  return (
    <aside className="hidden flex-col gap-6 xl:flex">
      {showMonth && (
        <MiniMonth
          month={mini.date.slice(0, 7)}
          days={mini.days}
          dotDays={new Set(items.map((item) => item.day))}
          today={today}
          weekHref={weekHref}
          previousHref={monthHref(mini.previous)}
          nextHref={monthHref(mini.next)}
        />
      )}
      <UpcomingCalls calls={upcoming} />
    </aside>
  );
}
