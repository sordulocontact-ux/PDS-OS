import { cn } from "@/lib/utils";
import type { DayTick } from "@/lib/utils/day-ticks";

const name = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// Under these shares of the width, a day's name would touch the marker's
// (« Aujourd'hui »): a desktop's wide chart, then a phone's narrow one.
const GAP = 0.08;
const PHONE_GAP = 0.2;

/**
 * The names under a chart's time axis (« 17 nov. », `dayTicks`): the day
 * and its month, so a reader sees both (Ibé, 16/11/2026), with an optional
 * marker (« Aujourd'hui ») that wins over a name too close to it. On a
 * phone, every other name. Decorative: each chart says its figures to a
 * screen reader. The chart draws its own grid lines at the same places.
 */
export function DayAxis({
  ticks,
  marker,
}: {
  ticks: DayTick[];
  marker?: { at: number; label: string };
}) {
  const near = (at: number, gap: number) =>
    marker !== undefined && Math.abs(at - marker.at) < gap;
  const edge = (at: number) =>
    at < 0.04 ? "" : at > 0.96 ? "-translate-x-full" : "-translate-x-1/2";
  return (
    <div
      aria-hidden
      className="relative mt-2 h-4 text-caption whitespace-nowrap text-[color:var(--text-secondary)] tabular-nums"
    >
      {marker && (
        <span
          className={cn("absolute", edge(marker.at))}
          style={{ left: `${marker.at * 100}%` }}
        >
          {marker.label}
        </span>
      )}
      {ticks
        .filter((t) => !near(t.at, GAP))
        .map((t, i) => (
          <span
            key={t.day}
            className={cn(
              "absolute",
              edge(t.at),
              (i % 2 === 1 || near(t.at, PHONE_GAP)) && "max-sm:hidden",
            )}
            style={{ left: `${t.at * 100}%` }}
          >
            {name.format(new Date(`${t.day}T12:00:00Z`))}
          </span>
        ))}
    </div>
  );
}
