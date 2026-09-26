/**
 * Calendar arithmetic, in code (rule 6): the countdown of a milestone is a
 * date difference, never something PO produces. Dates are "YYYY-MM-DD".
 */

const DAY_MS = 86_400_000;

function toUtcDay(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/** Days from the reference to the date: negative before, 0 on the day. */
export function dayOffset(date: string, reference: string): number {
  return toUtcDay(date) - toUtcDay(reference);
}

/**
 * The release date the calendar counts from: the planned release date entered
 * on the Release tab, else the project's due date, else none.
 */
export function referenceDate(
  plannedReleaseDate: string | null,
  projectDueDate: string | null,
): string | null {
  return plannedReleaseDate ?? projectDueDate ?? null;
}
