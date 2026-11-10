/** Date display for release pages. Europe/Paris, French locale. */

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

const date = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return date.format(new Date(iso));
}

const shortDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Europe/Paris",
});

/** "27 nov. 2026", for dense tables. */
export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(iso));
}

/** "18–28 nov. 2026", "18 nov. – 3 déc. 2026": a period in one short line. */
export function formatShortRange(from: string, to: string): string {
  return shortDate.formatRange(new Date(from), new Date(to));
}
