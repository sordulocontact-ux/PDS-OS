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

/** The date `days` days after `date` (negative: before). */
export function addDays(date: string, days: number): string {
  const day = toUtcDay(date) + days;
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * A day relative to the release as people write it (« J-10 », « J+2 »,
 * « J0 », « -10 »), read as a number of days; null when it is not one.
 */
export function parseRelativeDay(value: string): number | null {
  const match = /^\s*(?:[jJ]\s*)?([+\-−]?)\s*(\d{1,3})\s*$/.exec(value);
  if (!match) return null;
  const days = Number(match[2]);
  return match[1] === "-" || match[1] === "−" ? -days : days;
}

// The channels of the launch calendar (milestones.channel, same list in SQL):
// Organique, Influence, RP / Médias, Sortie, Live / Event, Autre.
export const MILESTONE_CHANNELS = [
  "organic",
  "influence",
  "press",
  "release",
  "live",
  "other",
] as const;
export type MilestoneChannel = (typeof MILESTONE_CHANNELS)[number];

export function isMilestoneChannel(value: unknown): value is MilestoneChannel {
  return (
    typeof value === "string" &&
    (MILESTONE_CHANNELS as readonly string[]).includes(value)
  );
}

/** The channel a new milestone of this kind most likely sits on. */
export function channelOfKind(kind: string): MilestoneChannel {
  if (kind === "release" || kind === "press" || kind === "live") return kind;
  // Internal steps of the team (MKT-S1-10): no audience channel.
  if (kind === "delivery" || kind === "validation") return "other";
  return "organic";
}
