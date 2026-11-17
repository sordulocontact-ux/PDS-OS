"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { formatAmount, formatAmountCompact } from "@/lib/utils/money";

const amount = (cents: number) => formatAmount(cents, { ht: false });
// In the ring's middle, the amount without its cents (Sacha 17/11/2026:
// « 72 042,49 € » ran over the ring), compact past a million.
const middle = (cents: number) =>
  cents >= 100_000_000
    ? formatAmountCompact(cents)
    : amount(Math.round(cents / 100) * 100);

// A circle of perimeter 100: each slice's length is its percent.
const R = 15.915;
const STROKE = 5;
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
 * a thin gap, the total in the ring's middle (Sacha 17/11/2026: « on voit
 * pas le prix global »), then one line per slice, its square, its name,
 * its amount and share; the figures never ride on colour alone. Hovering a
 * slice or its line (Sacha 17/11/2026: « au hover des parties on donne le
 * prix ») puts its name, amount and share in the middle, dims the others
 * and marks its line. Slices of zero are left out; with none, `empty`.
 */
export function DonutChart({
  slices,
  empty,
  totalLabel,
}: {
  slices: DonutSlice[];
  empty: string;
  totalLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
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
  const share = (cents: number) => `${Math.round((cents / total) * 100)} %`;
  const current = shown.find((s) => s.key === active) ?? null;
  const hover = (key: string) => ({
    onPointerEnter: () => setActive(key),
    onPointerLeave: () => setActive(null),
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-48 shrink-0">
        <svg viewBox="0 0 42 42" className="size-full -rotate-90" aria-hidden>
          {shown.map((s, i) => {
            const length = Math.max(lengths[i] - gap, 0.1);
            return (
              <circle
                key={s.key}
                cx="21"
                cy="21"
                r={R}
                fill="none"
                className={cn(
                  s.shade.stroke,
                  "cursor-default transition-opacity duration-150",
                  current && current.key !== s.key && "opacity-30",
                )}
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${100 - length}`}
                strokeDashoffset={starts[i]}
                {...hover(s.key)}
              />
            );
          })}
        </svg>
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-9 text-center"
        >
          <span className="max-w-full truncate text-caption text-[color:var(--text-secondary)]">
            {current ? current.label : totalLabel}
          </span>
          <span className="text-figure-lg font-medium">
            {middle(current ? current.cents : total)}
          </span>
          {current && (
            <span className="text-caption text-[color:var(--text-secondary)] tabular-nums">
              {share(current.cents)}
            </span>
          )}
        </div>
      </div>
      <ul className="grid w-full min-w-0 gap-1">
        {shown.map((s) => (
          <li
            key={s.key}
            className={cn(
              "-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-0.5 text-body-md transition-colors",
              current?.key === s.key && "bg-[var(--surface-soft)]",
            )}
            {...hover(s.key)}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={cn("size-2.5 shrink-0 rounded-xs", s.shade.fill)}
              />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 text-[color:var(--text-secondary)] tabular-nums">
              {amount(s.cents)} · {share(s.cents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
