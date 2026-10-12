// An instant of the app's history (sent, signed, filed, confirmed…), said
// with its hour (JUR-20): two events of the same day keep their order. The
// instant is stored in UTC (timestamptz) and shown in Paris time, the team's
// zone. A deadline without an hour is a date, never an instant: it keeps
// its own formatting and never gets a made-up hour. Client-safe.

const ZONE = "Europe/Paris";

const day = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: ZONE,
});
const hour = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZONE,
});
const full = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "medium",
  timeZone: ZONE,
});

/** « 11 oct. 2026 à 16:42 ». */
export function formatInstant(iso: string): string {
  const date = new Date(iso);
  return `${day.format(date)} à ${hour.format(date)}`;
}

/** « 16:42 », for a list already grouped by day. */
export function formatHour(iso: string): string {
  return hour.format(new Date(iso));
}

/** The full instant, with seconds and the zone, for a tooltip. */
export function formatInstantFull(iso: string): string {
  return `${full.format(new Date(iso))} (heure de Paris)`;
}
