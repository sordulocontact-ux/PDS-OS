import { cn } from "@/lib/utils";

const PARIS = "Europe/Paris";
const weekday = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  timeZone: PARIS,
});
const dayOfMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  timeZone: PARIS,
});
const month = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: PARIS,
});

/**
 * A day as a calendar leaf (Sacha 21/11/2026, the calls of a deal): the
 * weekday, the day's number large, the month; `ahead` for a day to come
 * (strong frame), else muted. Decorative: the row says the day in words
 * for screen readers.
 */
export function DateTile({ iso, ahead }: { iso: string; ahead: boolean }) {
  const date = new Date(iso);
  return (
    <span
      aria-hidden
      className={cn(
        "flex w-12 shrink-0 flex-col items-center rounded-lg border py-1 leading-none tabular-nums",
        ahead
          ? "border-foreground bg-card text-foreground"
          : "border-[color:var(--border-hairline)] bg-[var(--surface-soft)] text-[color:var(--text-secondary)]",
      )}
    >
      <span className="text-[length:var(--type-micro)] capitalize">
        {weekday.format(date).replace(".", "")}
      </span>
      <span className="py-0.5 text-[length:var(--type-figure-lg)] font-semibold">
        {dayOfMonth.format(date)}
      </span>
      <span className="text-[length:var(--type-micro)]">
        {month.format(date).replace(".", "")}
      </span>
    </span>
  );
}
