"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

import type { TreasuryPoint } from "@/lib/finance/treasury";
import type { TreasuryWeek } from "@/lib/finance/treasury-weeks";
import { treasury } from "@/lib/i18n/fr/treasury";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount, formatAmountCompact } from "@/lib/utils/money";

const fr = { treasury };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const DAY = 86400000;
const dayIndex = (from: string, day: string) =>
  Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY,
  );

// Four equal steps, round: 1, 2, 2.5 or 5 times a power of ten.
function niceStep(span: number) {
  const raw = Math.max(span, 1) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].find((s) => s * power >= raw) ?? 10) * power;
}

// A balance moves on the day money comes or goes: drawn in steps.
function stepPath(points: { x: number; y: number }[]) {
  return points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `H${p.x}V${p.y}`))
    .join("");
}

/**
 * The treasury's chart (Ibé's ticket, maquettes 1 and 6), as Sacha's Figma
 * of 15/11/2026: one bar a week, money in above the line in ink, money out
 * below it in grey, what is still forecast lighter in the same bar; the
 * balance over them, real then dashed, with the minimum reserve dotted
 * amber and the low point. Money in and out read the left axis, the
 * balance the right one; their gridlines are the same. Hover, touch or the
 * arrow keys read a week. Its figures are those of the calendar below
 * (lib/finance/treasury.ts).
 */
export function TreasuryChart({
  points,
  weeks,
  reserveCents,
  low,
  tall = false,
}: {
  points: TreasuryPoint[];
  weeks: TreasuryWeek[];
  reserveCents: number;
  low: { day: string; cents: number };
  tall?: boolean;
}) {
  const t = fr.treasury.chart;
  const [active, setActive] = useState<number | null>(null);
  const first = points[0]?.day ?? weeks[0]?.start ?? "";
  const days = Math.max(dayIndex(first, points.at(-1)?.day ?? first), 1);
  const x = (day: string) => (dayIndex(first, day) / (days + 1)) * 100;

  // Left axis: money in and out, symmetrical around zero.
  const flowStep = niceStep(
    2 * Math.max(1, ...weeks.flatMap((w) => [w.inCents, w.outCents])),
  );
  const flowTop = 2 * flowStep;
  const yFlow = (cents: number) => 50 - (cents / flowTop) * 50;
  // Right axis: the balance, four steps on the same gridlines.
  const values = points.map((p) => p.cents);
  const low_ = Math.min(...values, reserveCents);
  const high = Math.max(...values, reserveCents);
  let step = niceStep(high - low_);
  let bottom = Math.floor(low_ / step) * step;
  if (bottom + 4 * step < high) {
    step = niceStep(high - bottom + step);
    bottom = Math.floor(low_ / step) * step;
  }
  const yBalance = (cents: number) =>
    100 - ((cents - bottom) / (4 * step)) * 100;
  const grid = [0, 1, 2, 3, 4];

  const todayIndex = points.findIndex((p) => p.forecast);
  const today = points[todayIndex]?.day ?? first;
  const real = points.flatMap((p) =>
    p.forecast ? [] : [{ x: x(p.day), y: yBalance(p.cents) }],
  );
  const forecast = [
    ...real.slice(-1),
    ...points.flatMap((p) =>
      p.forecast ? [{ x: x(p.day), y: yBalance(p.cents) }] : [],
    ),
  ];
  const balanceAt = (day: string) =>
    [...points].reverse().find((p) => p.day <= day)?.cents ?? 0;
  const shown = active === null ? null : weeks[active];
  const months = weeks.flatMap((w, i) => {
    const firstOfMonth =
      i === 0 || w.start.slice(0, 7) !== weeks[i - 1].start.slice(0, 7);
    return firstOfMonth && i > 0 ? [w] : [];
  });

  function pick(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      Math.max((event.clientX - box.left) / box.width, 0),
      1,
    );
    const index = weeks.findIndex(
      (w) =>
        ratio * 100 >= x(w.start) && ratio * 100 <= x(w.end) + 100 / (days + 1),
    );
    setActive(index < 0 ? null : index);
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const move = {
      ArrowLeft: -1,
      ArrowRight: 1,
      Home: -weeks.length,
      End: weeks.length,
    }[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const now = weeks.findIndex((w) => today >= w.start && today <= w.end);
    setActive((current) =>
      Math.min(
        Math.max((current ?? Math.max(now, 0)) + move, 0),
        weeks.length - 1,
      ),
    );
  }

  const height = tall ? "h-72" : "h-60";
  return (
    <div className="flex gap-2">
      <Axis className={cn(height, "text-right")}>
        {grid.map((g) => (
          <span key={g}>{formatAmountCompact(flowTop - g * flowStep)}</span>
        ))}
      </Axis>
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
            height,
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
            {grid.map((g) => (
              <line
                key={g}
                x1="0"
                x2="100"
                y1={g * 25}
                y2={g * 25}
                vectorEffect="non-scaling-stroke"
                strokeDasharray={g === 2 ? undefined : "2 4"}
                className={
                  g === 2
                    ? "stroke-[var(--text-tertiary)]"
                    : "stroke-[var(--border-default)]"
                }
              />
            ))}
            {weeks.map((w, i) => {
              const left = x(w.start);
              const width = Math.max(x(w.end) - left + 100 / (days + 1), 0.5);
              const bar = { x: left + width * 0.22, width: width * 0.56 };
              const realIn = w.inCents - w.inAheadCents;
              const realOut = w.outCents - w.outAheadCents;
              return (
                <g
                  key={w.start}
                  className={cn(
                    active !== null && active !== i && "opacity-50",
                  )}
                >
                  <rect
                    {...bar}
                    y={yFlow(realIn)}
                    height={50 - yFlow(realIn)}
                    className="fill-[var(--text-primary)]"
                  />
                  <rect
                    {...bar}
                    y={yFlow(w.inCents)}
                    height={yFlow(realIn) - yFlow(w.inCents)}
                    className="fill-[var(--border-default)]"
                  />
                  <rect
                    {...bar}
                    y={50}
                    height={yFlow(-realOut) - 50}
                    className="fill-[var(--text-tertiary)]"
                  />
                  <rect
                    {...bar}
                    y={yFlow(-realOut)}
                    height={yFlow(-w.outCents) - yFlow(-realOut)}
                    className="fill-[var(--border-default)]"
                  />
                </g>
              );
            })}
            {reserveCents > 0 && (
              <line
                x1="0"
                x2="100"
                y1={yBalance(reserveCents)}
                y2={yBalance(reserveCents)}
                vectorEffect="non-scaling-stroke"
                strokeWidth={1.5}
                strokeDasharray="1.5 3"
                strokeLinecap="round"
                className="stroke-[var(--tone-warning-fg)]"
              />
            )}
            {todayIndex > 0 && (
              <line
                x1={x(today)}
                x2={x(today)}
                y1="0"
                y2="100"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 4"
                className="stroke-[var(--text-tertiary)]"
              />
            )}
            {/* The balance over the bars: a halo of the card keeps it read. */}
            {[real, forecast].map((line, i) => (
              <g key={i}>
                <path
                  d={stepPath(line)}
                  fill="none"
                  strokeWidth={6}
                  vectorEffect="non-scaling-stroke"
                  className="stroke-[var(--card)]"
                />
                <path
                  d={stepPath(line)}
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray={i === 1 ? "5 4" : undefined}
                  vectorEffect="non-scaling-stroke"
                  className="stroke-[var(--text-primary)]"
                />
              </g>
            ))}
          </svg>
          {points.some((p) => p.forecast && p.day === low.day) && (
            <span
              aria-hidden
              className="absolute size-2.5 -translate-1/2 rounded-full bg-[var(--tone-warning-fg)] ring-2 ring-card"
              style={{ left: `${x(low.day)}%`, top: `${yBalance(low.cents)}%` }}
            />
          )}
          {shown && active !== null && (
            <span
              aria-live="polite"
              className={cn(
                "pointer-events-none absolute top-0 z-10 flex w-max flex-col gap-0.5 rounded-lg border border-border bg-popover px-2.5 py-2 text-caption text-popover-foreground shadow-md",
                active > weeks.length / 2
                  ? "-translate-x-[calc(100%+8px)]"
                  : "translate-x-2",
              )}
              style={{ left: `${x(shown.start)}%` }}
            >
              <span className="text-[color:var(--text-secondary)]">
                {t.week(
                  formatShortDay(shown.start, { bare: true }),
                  formatShortDay(shown.end, { bare: true }),
                )}
              </span>
              <span className="tabular-nums">
                {t.in} +{amount(shown.inCents)}
                {shown.inAheadCents > 0 &&
                  ` · ${t.ahead(amount(shown.inAheadCents))}`}
              </span>
              <span className="tabular-nums">
                {t.out} −{amount(shown.outCents)}
                {shown.outAheadCents > 0 &&
                  ` · ${t.ahead(amount(shown.outAheadCents))}`}
              </span>
              <span className="font-semibold tabular-nums">
                {t.balanceAfter} {amount(balanceAt(shown.end))}
              </span>
            </span>
          )}
        </div>
        <div
          aria-hidden
          className="relative mt-2 h-4 text-caption text-[color:var(--text-secondary)]"
        >
          {todayIndex >= 0 && (
            <span
              className={cn(
                "absolute whitespace-nowrap",
                x(today) > 3 && "-translate-x-1/2",
              )}
              style={{ left: `${x(today)}%` }}
            >
              {t.today}
            </span>
          )}
          {months
            .filter((w) => Math.abs(x(w.start) - x(today)) > 8)
            .map((w) => (
              <span
                key={w.start}
                className="absolute -translate-x-1/2 capitalize"
                style={{ left: `${x(w.start)}%` }}
              >
                {new Intl.DateTimeFormat("fr-FR", {
                  month: "short",
                  timeZone: "UTC",
                }).format(new Date(`${w.start}T12:00:00Z`))}
              </span>
            ))}
        </div>
      </div>
      <Axis className={height}>
        {grid.map((g) => (
          <span key={g}>{formatAmountCompact(bottom + (4 - g) * step)}</span>
        ))}
      </Axis>
    </div>
  );
}

/** An axis's five amounts, on the five gridlines. */
function Axis({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex w-14 shrink-0 flex-col justify-between text-caption text-[color:var(--text-secondary)] tabular-nums [&>span]:-translate-y-1/2 [&>span:first-child]:translate-y-0 [&>span:last-child]:translate-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
