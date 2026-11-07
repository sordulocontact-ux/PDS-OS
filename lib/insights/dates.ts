/** Calendar helpers in the label's time zone. Pure code: dates are facts. */

const TIME_ZONE = "Europe/Paris";

/** Today as "YYYY-MM-DD" in Paris. */
export function todayInParis(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** The time of day as "HH:MM" in Paris. */
export function timeInParis(now = new Date()): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

export function isOverdue(dueDate: string, today = todayInParis()): boolean {
  return dueDate < today;
}

/** ISO timestamp `days` days ago. */
export function daysAgo(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
