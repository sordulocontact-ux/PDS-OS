// Dates said the way the proto « Projet complet » says them (docs/DESIGN.md
// § 4, « Dates », C0 of 18/10/2026). A date of a fact is said in full,
// « Sam. 05/12/2026 » (VISION-UX rule 4); a source or a line of history says
// it short, « le 14/10 », or with its hour, « 19/10, 11:16 ». Paris time, the
// team's zone. A calendar date (« 2026-12-05 ») is a day, never shifted by a
// zone; an instant (timestamptz) is read in Paris. Client-safe.

const ZONE = "Europe/Paris";
const CALENDAR = /^(\d{4})-(\d{2})-(\d{2})$/;

const parts = (zone: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: zone,
  });
const inParis = parts(ZONE);
const inUtc = parts("UTC");

type DayParts = {
  weekday: string;
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
};

function read(value: string | Date): DayParts | null {
  let date: Date;
  let format = inParis;
  const calendar = typeof value === "string" ? CALENDAR.exec(value) : null;
  if (calendar) {
    // Noon UTC: the same calendar day whatever the zone.
    date = new Date(Date.UTC(+calendar[1], +calendar[2] - 1, +calendar[3], 12));
    format = inUtc;
  } else {
    date = typeof value === "string" ? new Date(value) : value;
  }
  if (Number.isNaN(date.getTime())) return null;
  const out: Record<string, string> = {};
  for (const p of format.formatToParts(date)) out[p.type] = p.value;
  return {
    weekday: out.weekday ?? "",
    day: out.day ?? "",
    month: out.month ?? "",
    year: out.year ?? "",
    hour: out.hour ?? "",
    minute: out.minute ?? "",
  };
}

/** « Sam. 05/12/2026 »: the date of a fact, said in full; « 05/12/2026 »
 *  with `weekday: false` (a spend's day in its table, Sacha 13/11/2026). */
export function formatDay(
  value: string | Date,
  { weekday: withWeekday = true }: { weekday?: boolean } = {},
): string {
  const p = read(value);
  if (!p) return "";
  if (!withWeekday) return `${p.day}/${p.month}/${p.year}`;
  const weekday = p.weekday.replace(/\.$/, "");
  const capital = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capital}. ${p.day}/${p.month}/${p.year}`;
}

/** « le 14/10 » in a source or a line of history; « 14/10 » with `bare`. */
export function formatShortDay(
  value: string | Date,
  { bare = false }: { bare?: boolean } = {},
): string {
  const p = read(value);
  if (!p) return "";
  const short = `${p.day}/${p.month}`;
  return bare ? short : `le ${short}`;
}

/** « 19/10, 11:16 »: an instant of a history line, with its hour. */
export function formatShortInstant(value: string | Date): string {
  const p = read(value);
  if (!p) return "";
  return `${p.day}/${p.month}, ${p.hour}:${p.minute}`;
}
