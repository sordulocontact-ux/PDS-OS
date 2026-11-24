"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

import { DayAxis } from "@/components/ui/day-axis";
import type { TreasuryPoint } from "@/lib/finance/treasury";
import {
  lineIndices,
  linePath,
  nearestIndex,
} from "@/lib/finance/treasury-line";
import { treasury } from "@/lib/i18n/fr/treasury";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";
import { dayTicks } from "@/lib/utils/day-ticks";
import { formatAmount, formatAmountCompact } from "@/lib/utils/money";

const fr = { treasury };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/** Round bounds and four steps: 1, 2, 2.5 or 5 times a power of ten. */
function axis(low: number, high: number) {
  const span = Math.max(high - low, 1);
  const power = 10 ** Math.floor(Math.log10(span / 3));
  const step =
    ([1, 2, 2.5, 5, 10].find((s) => s * power * 3 >= span) ?? 10) * power;
  const bottom = Math.floor(low / step) * step;
  const top = Math.max(Math.ceil(high / step) * step, bottom + step);
  const ticks: number[] = [];
  for (let v = top; v >= bottom - step / 2; v -= step) ticks.push(v);
  return { bottom, top, ticks };
}

/**
 * The treasury's curve (Ibé's ticket, maquettes 1 and 6), drawn as Midday
 * draws its reports (13/11/2026): a line through one balance a week, today
 * and the low point (lib/finance/treasury-line.ts, Sacha 24/11/2026), one ink, the real balance solid up to
 * today, the forecast dashed after it, the minimum reserve dotted amber,
 * the low point marked; the grid in faint dashes. Hover, touch or the arrow keys
 * read the balance of a point of the line. The figures it draws are those of the calendar
 * below it (lib/finance/treasury.ts).
 */
export function TreasuryChart({
  points,
  reserveCents,
  low,
  tall = false,
}: {
  points: TreasuryPoint[];
  reserveCents: number;
  low: { day: string; cents: number };
  tall?: boolean;
}) {
  const t = fr.treasury.chart;
  const [active, setActive] = useState<number | null>(null);
  const values = points.map((p) => p.cents);
  const {
    bottom,
    top,
    ticks: levels,
  } = axis(
    Math.min(...values, reserveCents, 0),
    Math.max(...values, reserveCents),
  );
  const last = Math.max(points.length - 1, 1);
  const x = (i: number) => (i / last) * 100;
  const y = (cents: number) => ((top - cents) / (top - bottom)) * 100;
  const todayIndex = points.findIndex((p) => p.forecast);
  const lowIndex = points.findIndex((p) => p.forecast && p.day === low.day);
  // The last real day (the day before today's forecast point, or the end).
  const lastReal = todayIndex > 0 ? todayIndex - 1 : todayIndex < 0 ? last : -1;
  const picked = lineIndices(points.length, Math.max(todayIndex, 0), [
    lastReal,
    lowIndex,
  ]);
  const at = (i: number) => ({ x: x(i), y: y(points[i].cents) });
  const real = picked.filter((i) => !points[i].forecast).map(at);
  // The forecast starts from today's real balance: what is late and counted
  // today shows as a slope on today's line.
  const forecast = [
    ...real.slice(-1),
    ...picked.filter((i) => points[i].forecast).map(at),
  ];
  const shown = active === null ? null : points[active];
  // A day named every week or two under the axis, with its grid line
  // (Ibé 16/11/2026: see the days or the months).
  const ticks = dayTicks(points.map((p) => p.day));

  function pick(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      Math.max((event.clientX - box.left) / box.width, 0),
      1,
    );
    setActive(nearestIndex(picked, Math.round(ratio * last)));
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const step = {
      ArrowLeft: -1,
      ArrowRight: 1,
      Home: -picked.length,
      End: picked.length,
    }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    setActive((current) => {
      const from = picked.indexOf(
        nearestIndex(picked, current ?? Math.max(todayIndex, 0)),
      );
      return picked[Math.min(Math.max(from + step, 0), picked.length - 1)];
    });
  }

  return (
    <div className="flex gap-2">
      <div
        aria-hidden
        className={cn(
          "flex w-14 shrink-0 flex-col justify-between text-right text-caption text-[color:var(--text-secondary)] tabular-nums",
          tall ? "h-72" : "h-56",
        )}
      >
        {levels.map((tick) => (
          <span
            key={tick}
            className="-translate-y-1/2 first:translate-y-0 last:translate-y-0"
          >
            {formatAmountCompact(tick)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div
          role="img"
          tabIndex={0}
          aria-label={t.summary(
            amount(points[todayIndex]?.cents ?? 0),
            amount(low.cents),
            formatShortDay(low.day, { bare: true }),
          )}
          className={cn(
            "relative touch-pan-y rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
            tall ? "h-72" : "h-56",
          )}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={key}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {levels.map((tick) => (
              <line
                key={tick}
                x1="0"
                x2="100"
                y1={y(tick)}
                y2={y(tick)}
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 4"
                className="stroke-[var(--border-default)]"
              />
            ))}
            {ticks.map((tick) => (
              <line
                key={tick.day}
                x1={tick.at * 100}
                x2={tick.at * 100}
                y1="0"
                y2="100"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 4"
                className="stroke-[var(--border-hairline)]"
              />
            ))}
            {reserveCents > 0 && (
              <line
                x1="0"
                x2="100"
                y1={y(reserveCents)}
                y2={y(reserveCents)}
                vectorEffect="non-scaling-stroke"
                strokeWidth={1.5}
                strokeDasharray="2 7"
                strokeLinecap="round"
                className="stroke-[var(--tone-warning-fg)]"
              />
            )}
            {todayIndex > 0 && (
              <line
                x1={x(todayIndex)}
                x2={x(todayIndex)}
                y1="0"
                y2="100"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 4"
                className="stroke-[var(--text-tertiary)]"
              />
            )}
            <path
              d={linePath(real)}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-[var(--text-primary)]"
            />
            <path
              d={linePath(forecast)}
              fill="none"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-[var(--text-tertiary)]"
            />
            {shown && (
              <line
                x1={x(active ?? 0)}
                x2={x(active ?? 0)}
                y1="0"
                y2="100"
                vectorEffect="non-scaling-stroke"
                className="stroke-[var(--text-tertiary)]"
              />
            )}
          </svg>
          {lowIndex >= 0 && (
            <span
              aria-hidden
              className="absolute size-2.5 -translate-1/2 rounded-full bg-[var(--tone-warning-fg)] ring-2 ring-card"
              style={{ left: `${x(lowIndex)}%`, top: `${y(low.cents)}%` }}
            />
          )}
          {shown && active !== null && (
            <>
              <span
                aria-hidden
                className="absolute size-2.5 -translate-1/2 rounded-full bg-[var(--text-primary)] ring-2 ring-card"
                style={{ left: `${x(active)}%`, top: `${y(shown.cents)}%` }}
              />
              <span
                aria-live="polite"
                className={cn(
                  "pointer-events-none absolute top-0 z-10 flex w-max flex-col gap-0.5 rounded-lg border border-border bg-popover px-2.5 py-2 text-caption text-popover-foreground shadow-md",
                  active > last / 2
                    ? "-translate-x-[calc(100%+8px)]"
                    : "translate-x-2",
                )}
                style={{ left: `${x(active)}%` }}
              >
                <span className="text-[color:var(--text-secondary)]">
                  {formatShortDay(shown.day, { bare: true })} ·{" "}
                  {shown.forecast ? t.forecast : t.real}
                </span>
                <span className="font-semibold tabular-nums">
                  {amount(shown.cents)}
                </span>
              </span>
            </>
          )}
        </div>
        <DayAxis
          ticks={ticks}
          marker={
            todayIndex >= 0
              ? { at: todayIndex / last, label: t.today }
              : undefined
          }
        />
      </div>
    </div>
  );
}
