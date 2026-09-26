import { todayInParis } from "@/lib/insights/dates";

/** Date and time formats of the history pages, on Paris time. */

const TIME_ZONE = "Europe/Paris";

const day = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const time = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

export const formatLongDay = (iso: string) => day.format(new Date(iso));
export const formatTime = (iso: string) => time.format(new Date(iso));

/** "YYYY-MM-DD" of an instant, in Paris. */
export const parisDay = (iso: string) => todayInParis(new Date(iso));

/** Events grouped by Paris day, keeping the given (newest first) order. */
export function groupByDay<T extends { at: string }>(
  events: T[],
): Array<{ day: string; events: T[] }> {
  const groups: Array<{ day: string; events: T[] }> = [];
  for (const event of events) {
    const key = parisDay(event.at);
    const last = groups.at(-1);
    if (last?.day === key) last.events.push(event);
    else groups.push({ day: key, events: [event] });
  }
  return groups;
}
