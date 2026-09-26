// Planning labels ("YYYY-MM-DD", read at noon to stay on the day). Full
// dates reuse formatDay (lib/assistant/facts.ts).
const weekdayFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
});
const monthFormat = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

const atNoon = (date: string) => new Date(`${date}T12:00:00`);

export const formatWeekday = (date: string) =>
  weekdayFormat.format(atNoon(date));
// "2026-10" → "octobre 2026".
export const formatMonth = (month: string) =>
  monthFormat.format(atNoon(`${month}-01`));
