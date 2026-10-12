import {
  formatHour,
  formatInstant,
  formatInstantDay,
  formatInstantFull,
} from "@/lib/utils/instant";

/**
 * An instant of the history (JUR-20), the same everywhere: « 11 oct. 2026 à
 * 16:42 », the hour alone (`show="hour"`) in a list grouped by day, or the
 * day alone (`show="day"`) in a « last change » column. The
 * machine value and the full instant (seconds, zone) stay readable by
 * assistive technologies and on hover.
 */
export function Timestamp({
  iso,
  hourOnly = false,
  show = hourOnly ? "hour" : "instant",
  className,
}: {
  iso: string;
  hourOnly?: boolean;
  show?: "instant" | "hour" | "day";
  className?: string;
}) {
  return (
    <time
      dateTime={iso}
      title={formatInstantFull(iso)}
      className={className}
    >
      {show === "hour"
        ? formatHour(iso)
        : show === "day"
          ? formatInstantDay(iso)
          : formatInstant(iso)}
    </time>
  );
}
