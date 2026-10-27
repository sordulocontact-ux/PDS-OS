import { artistActivity } from "@/lib/i18n/fr/artist-activity";

const fr = { artistActivity };

// Days and times of the log, in Europe/Paris, computed by the code.
const TIME_ZONE = "Europe/Paris";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export type ActivityDay<T> = {
  // "2026-09-27", unique on the page.
  key: string;
  label: string;
  events: T[];
};

/** "YYYY-MM-DD" of an instant, in Paris. */
function dayKey(date: Date): string {
  return dayKeyFormat.format(date);
}

export function formatActivityTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** Events (newest first) grouped by Paris day, labelled against `now`. */
export function groupByDay<T extends { createdAt: string }>(
  events: T[],
  now: Date,
): ActivityDay<T>[] {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const days: ActivityDay<T>[] = [];
  for (const event of events) {
    const date = new Date(event.createdAt);
    const key = dayKey(date);
    let day = days.at(-1);
    if (!day || day.key !== key) {
      const label =
        key === today
          ? fr.artistActivity.today
          : key === yesterday
            ? fr.artistActivity.yesterday
            : capitalize(dayLabelFormat.format(date));
      day = { key, label, events: [] };
      days.push(day);
    }
    day.events.push(event);
  }
  return days;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
