import {
  formatHour,
  formatInstant,
  formatInstantDay,
  formatInstantFull,
} from "@/lib/utils/instant";
import { formatShortInstant } from "@/lib/utils/day";

/**
 * An instant of the history (JUR-20), the same everywhere: « 11 oct. 2026 à
 * 16:42 », the hour alone (`show="hour"`) in a list grouped by day, or the
 * day alone (`show="day"`) in a « last change » column, or the short form
 * of the journeys' sources and histories (`show="short"`: « 19/10, 11:16 »,
 * C0 decision 8). The
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
  show?: "instant" | "hour" | "day" | "short";
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
          : show === "short"
            ? formatShortInstant(iso)
            : formatInstant(iso)}
    </time>
  );
}
