import { CalendarEventLink } from "@/components/calls/calendar-event";
import type { CalendarEvent } from "@/lib/calls/calendar";
import { calls } from "@/lib/i18n/fr/calls";
import { cn } from "@/lib/utils";

const fr = { calls };

const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * The period on a phone, as Teams' agenda: one heading per day, its calls
 * in order, each opening its page. `skipEmpty`: a month lists only the days
 * that have calls.
 */
export function AgendaList({
  days,
  events,
  today,
  skipEmpty,
}: {
  days: string[];
  events: CalendarEvent[];
  today: string;
  skipEmpty: boolean;
}) {
  const t = fr.calls.calendar;
  const listed = days
    .map((day) => ({
      day,
      events: events
        .filter((e) => e.day === day)
        .sort((a, b) => a.start - b.start),
    }))
    .filter((d) => !skipEmpty || d.events.length > 0);

  if (listed.length === 0)
    return <p className="text-sm text-muted-foreground">{t.empty}</p>;

  return (
    <ol className="flex flex-col gap-5">
      {listed.map(({ day, events: own }) => (
        <li key={day} className="flex flex-col gap-2">
          <h3
            className={cn(
              "text-sm font-semibold first-letter:uppercase",
              day !== today && "text-muted-foreground",
            )}
            aria-current={day === today ? "date" : undefined}
          >
            {longDay.format(new Date(`${day}T00:00:00Z`))}
          </h3>
          {own.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.dayEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {own.map((event) => (
                <li key={event.call.id}>
                  <CalendarEventLink event={event} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
