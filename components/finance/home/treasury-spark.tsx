import type { Treasury } from "@/lib/finance/treasury";

const W = 260;
const H = 72;

/**
 * The balance from today to the horizon, as steps (each move changes it on
 * its day), with the minimum reserve dashed in red: the small chart of the
 * overview's « Trésorerie » card. Decorative: the card's sentence says the
 * figures.
 */
export function TreasurySpark({ treasury }: { treasury: Treasury }) {
  const points = treasury.points.filter((p) => p.forecast);
  if (points.length < 2) return null;
  const days = points.map((p) => Date.parse(`${p.day}T00:00:00Z`));
  const values = points.map((p) => p.cents);
  const reserve = treasury.reserveCents;
  const lo = Math.min(...values, reserve || Infinity);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const first = days[0];
  const range = days[days.length - 1] - first || 1;
  const x = (day: number) => ((day - first) / range) * W;
  const y = (cents: number) => 6 + ((hi - cents) / span) * (H - 12);
  const path = points
    .map((p, i) =>
      i === 0
        ? `M0,${y(p.cents).toFixed(1)}`
        : `L${x(days[i]).toFixed(1)},${y(points[i - 1].cents).toFixed(1)} L${x(days[i]).toFixed(1)},${y(p.cents).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
      className="h-[72px] w-full overflow-visible"
    >
      {reserve > 0 && (
        <line
          x1={0}
          x2={W}
          y1={y(reserve)}
          y2={y(reserve)}
          stroke="var(--error)"
          strokeDasharray="3 3"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
