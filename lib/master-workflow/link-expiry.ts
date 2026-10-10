// How long the engineer's link lives (UX test of 09/10/2026: a link valid
// until 8 Nov. for a final mix expected on 17 Nov.). Pure code, client-safe.

const DAY_MS = 24 * 60 * 60 * 1000;
// Never less than the original 30 days, a fortnight past the stage's final
// date (late deliveries, last corrections), and within what the database
// accepts (180 days).
export const MIN_LINK_DAYS = 30;
export const LINK_MARGIN_DAYS = 14;
const MAX_LINK_DAYS = 179;

/** `finalDue`: "YYYY-MM-DD", the stage's last date in the Brief, if any. */
export function transmissionExpiry(now: Date, finalDue: string | null): Date {
  const floor = now.getTime() + MIN_LINK_DAYS * DAY_MS;
  const due = finalDue ? Date.parse(`${finalDue}T23:59:59Z`) : Number.NaN;
  const wanted = Number.isNaN(due) ? floor : due + LINK_MARGIN_DAYS * DAY_MS;
  const ceiling = now.getTime() + MAX_LINK_DAYS * DAY_MS;
  return new Date(Math.min(Math.max(floor, wanted), ceiling));
}
