import { cn } from "@/lib/utils";
import type { DayTick } from "@/lib/utils/day-ticks";

const dayName = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const monthName = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});
const yearMonthName = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// « 17 nov. » on a day; « déc. » on a month, « janv. 2027 » when a year
// starts.
function tickName(tick: DayTick) {
  const date = new Date(`${tick.day}T12:00:00Z`);
  if (!tick.month) return dayName.format(date);
  return (tick.day.slice(5, 7) === "01" ? yearMonthName : monthName).format(
    date,
  );
}

// Under these shares of the width, a day's name would touch the marker's
// (« Aujourd'hui »): a desktop's wide chart, then a phone's narrow one.
const GAP = 0.08;
const PHONE_GAP = 0.2;
// Two names never closer than this share of the width (Sacha 17/11/2026:
// a year's names ran into each other): one of them is left out.
const MIN_APART = 0.06;

/**
 * The names under a chart's time axis (`dayTicks`): « 17 nov. », the day
 * and its month, so a reader sees both (Ibé, 16/11/2026), or the month
 * alone on a long chart (« déc. », « janv. 2027 »), with an optional
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
  // The names kept, in order: none too close to the marker or to the name
  // before it.
  const kept = ticks.reduce<DayTick[]>(
    (list, t) =>
      near(t.at, GAP) || (list.length > 0 && t.at - list[list.length - 1].at < MIN_APART)
        ? list
        : [...list, t],
    [],
  );
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
      {kept.map((t, i) => (
          <span
            key={t.day}
            className={cn(
              "absolute",
              edge(t.at),
              (i % 2 === 1 || near(t.at, PHONE_GAP)) && "max-sm:hidden",
            )}
            style={{ left: `${t.at * 100}%` }}
          >
            {tickName(t)}
          </span>
        ))}
    </div>
  );
}
