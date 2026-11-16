import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/utils/money";

const amount = (cents: number) => formatAmount(cents, { ht: false });

// A circle of perimeter 100: each slice's length is its percent.
const R = 15.915;
// The surface's gap between two slices, in percent of the circle.
const GAP = 0.6;

export type DonutSlice = {
  key: string;
  label: string;
  cents: number;
  // The slice's shade: its stroke on the ring, its fill in the legend's
  // square (`postShade`, `rampShade` of lib/ui/category-hues.ts).
  shade: { fill: string; stroke: string };
};

/**
 * A share of a whole as a ring and its legend (Finance's camemberts: the
 * split by poste, the split of the budgets): each slice in its shade with
 * a thin gap, then one line per slice, its square, its name, its amount and
 * share; the figures never ride on colour alone. Slices of zero are left
 * out; with none, `empty`.
 */
export function DonutChart({
  slices,
  empty,
}: {
  slices: DonutSlice[];
  empty: string;
}) {
  const shown = slices.filter((s) => s.cents > 0);
  const total = shown.reduce((sum, s) => sum + s.cents, 0);
  if (total === 0)
    return (
      <p className="text-body-md text-[color:var(--text-secondary)]">{empty}</p>
    );
  const gap = shown.length > 1 ? GAP : 0;
  // Each slice starts where the ones before it end, from the top.
  const lengths = shown.map((s) => (s.cents / total) * 100);
  const starts = lengths.map(
    (_, i) => 25 - lengths.slice(0, i).reduce((a, b) => a + b, 0),
  );
  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox="0 0 42 42" className="size-36 shrink-0 -rotate-90"
        aria-hidden>
        {shown.map((s, i) => {
          const length = Math.max(lengths[i] - gap, 0.1);
          return (
            <circle
              key={s.key}
              cx="21"
              cy="21"
              r={R}
              fill="none"
              className={s.shade.stroke}
              strokeWidth="6"
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={starts[i]}
            />
          );
        })}
      </svg>
      <ul className="grid w-full min-w-0 gap-2">
        {shown.map((s) => (
          <li
            key={s.key}
            className="flex items-center justify-between gap-3 text-body-md"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={cn("size-2.5 shrink-0 rounded-xs", s.shade.fill)}
              />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 text-[color:var(--text-secondary)] tabular-nums">
              {amount(s.cents)} · {Math.round((s.cents / total) * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
