import { formatHour, formatInstant, formatInstantFull } from "@/lib/utils/instant";

/**
 * An instant of the history (JUR-20), the same everywhere: « 11 oct. 2026 à
 * 16:42 », or the hour alone (`hourOnly`) in a list grouped by day. The
 * machine value and the full instant (seconds, zone) stay readable by
 * assistive technologies and on hover.
 */
export function Timestamp({
  iso,
  hourOnly = false,
  className,
}: {
  iso: string;
  hourOnly?: boolean;
  className?: string;
}) {
  return (
    <time
      dateTime={iso}
      title={formatInstantFull(iso)}
      className={className}
    >
      {hourOnly ? formatHour(iso) : formatInstant(iso)}
    </time>
  );
}
