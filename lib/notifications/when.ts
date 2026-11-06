// When a notification arrived, for the bell's menu (Figma: « Today, Last 7
// days, Older », « 5m ago », « Nov 3 »), in Paris time, the team's zone.
// Client-safe.

import { notifications } from "@/lib/i18n/fr/notifications";

const fr = { notifications };
const ZONE = "Europe/Paris";

// « 2026-11-06 »: the Paris day of an instant, comparable as text.
const dayKey = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: ZONE,
});
const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: ZONE,
});
const dayMonthYear = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: ZONE,
});

const DAY_MS = 86_400_000;

export type NotificationGroup = "today" | "week" | "older";

export function notificationGroup(iso: string, now: number): NotificationGroup {
  const today = dayKey.format(now);
  const day = dayKey.format(new Date(iso));
  if (day === today) return "today";
  const days = (Date.parse(today) - Date.parse(day)) / DAY_MS;
  return days < 7 ? "week" : "older";
}

/** « à l'instant », « il y a 5 min », « il y a 2 h » today; « 3 nov. » before. */
export function notificationAgo(iso: string, now: number): string {
  const t = fr.notifications.ago;
  const date = new Date(iso);
  if (dayKey.format(date) !== dayKey.format(now))
    return (
      date.getFullYear() === new Date(now).getFullYear()
        ? dayMonth
        : dayMonthYear
    ).format(date);
  const minutes = Math.floor((now - date.getTime()) / 60_000);
  if (minutes < 1) return t.now;
  if (minutes < 60) return t.minutes(minutes);
  return t.hours(Math.floor(minutes / 60));
}
