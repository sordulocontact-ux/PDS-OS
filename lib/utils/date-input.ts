/**
 * Pure helpers of the date field (components/ui/date-picker.tsx): days are
 * "YYYY-MM-DD" strings, read and written in UTC so a calendar day never shifts
 * with the time zone. Typed dates are French: « jj/mm/aaaa ».
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");

const toIso = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const utc = (day: string) => new Date(`${day}T00:00:00Z`);

/** A real calendar day ("2026-02-31" is not one). */
export function isDay(value: string): boolean {
  const m = ISO.exec(value);
  return !!m && toIso(utc(value)) === value;
}

export function addDays(day: string, days: number): string {
  const d = utc(day);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Same day of the month, kept inside the month (31/01 + 1 month = 28/02). */
export function addMonths(day: string, months: number): string {
  const d = utc(day);
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1),
  );
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return toIso(target);
}

/** First day of the month of `day`. */
export function monthOf(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** The 42 days (6 weeks, Monday first) drawn for the month of `month`: the
 * grid keeps one height from a month to the next. */
export function monthGrid(month: string): string[] {
  const first = utc(monthOf(month));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = addDays(toIso(first), -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Monday of the week of `day`. */
export function weekStart(day: string): string {
  return addDays(day, -((utc(day).getUTCDay() + 6) % 7));
}

export function inRange(day: string, min?: string, max?: string): boolean {
  return (!min || day >= min) && (!max || day <= max);
}

/** « 05/12/2026 », the editable form of a day. */
export function formatTyped(day: string): string {
  if (!isDay(day)) return "";
  return `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
}

/**
 * What the field shows while typing: digits only, slashes put in place
 * (« 0512 » → « 05/12/ »). A deletion is left alone so a slash can be erased.
 */
export function maskTyped(raw: string, deleting: boolean): string {
  if (deleting) return raw.replace(/[^\d/]/g, "").slice(0, 10);
  // « 5/ » → « 05/ »: a slash typed after one digit closes the part.
  const parts = raw.replace(/[.\-\s]/g, "/").split("/");
  const closed = parts
    .slice(0, -1)
    .map((p, i) => (i < 2 && p.length === 1 ? `0${p}` : p));
  const digits = [...closed, parts.at(-1) ?? ""]
    .join("")
    .replace(/\D/g, "")
    .slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4);
  if (digits.length < 2) return digits;
  if (digits.length < 4) return `${day}/${month}`;
  return `${day}/${month}/${year}`;
}

/**
 * The day a typed text names, or null. `complete` accepts only « jj/mm/aaaa »
 * (while typing: « 05/12/20 » is not yet 2020); otherwise « 5/12 » (this
 * year, taken from `today`), « 5/12/26 », « 05.12.2026 », « 05122026 ».
 */
export function parseTyped(
  text: string,
  today: string,
  { complete = false }: { complete?: boolean } = {},
): string | null {
  const t = text.trim();
  let d: string, m: string, y: string;
  const parts = t.split(/[/.\-\s]+/).filter(Boolean);
  if (parts.length === 1 && /^\d{6}(\d{2})?$/.test(t)) {
    [d, m, y] = [t.slice(0, 2), t.slice(2, 4), t.slice(4)];
  } else if (parts.length === 2 || parts.length === 3) {
    [d, m, y = today.slice(0, 4)] = parts;
  } else return null;
  if (complete && (parts.length !== 3 || y.length !== 4)) return null;
  if (
    !/^\d{1,2}$/.test(d) ||
    !/^\d{1,2}$/.test(m) ||
    !/^\d{2}(\d{2})?$/.test(y)
  )
    return null;
  const year = y.length === 2 ? `20${y}` : y;
  const day = `${year}-${pad(Number(m))}-${pad(Number(d))}`;
  return isDay(day) ? day : null;
}
