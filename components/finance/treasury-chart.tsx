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

// Round steps: 1, 2, 2.5 or 5 times a power of ten, `count` of them.
function niceStep(span: number, count: number) {
  const raw = Math.max(span, 1) / count;
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
 * The treasury's chart (Ibé's ticket, maquettes 1 and 6), in two bands over
 * the same weeks (Sacha 15/11/2026: one chart with two axes « impossible à
 * lire »): above, the balance alone on its axis, real then dashed, the
 * minimum reserve dotted amber and the low point; below, a lower band of
 * one bar a week, money in above its zero in ink, money out below in grey,
 * what is still forecast lighter in the same bar. Hover, touch or the arrow
 * keys read a week in both. Its figures are those of the calendar
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

  // The balance's axis: four round steps from below its lowest.
  const values = points.map((p) => p.cents);
  const lowest = Math.min(...values, reserveCents);
  const highest = Math.max(...values, reserveCents);
  const step = niceStep(highest - Math.min(lowest, 0), 4);
  const bottom = Math.min(0, Math.floor(lowest / step) * step);
  const top = Math.max(bottom + 4 * step, Math.ceil(highest / step) * step);
  const balanceTicks = Array.from(
    { length: Math.round((top - bottom) / step) + 1 },
    (_, i) => top - i * step,
  );
  const yBalance = (cents: number) =>
    ((top - cents) / Math.max(top - bottom, 1)) * 100;

  // The flows' axis: symmetrical around zero, one step each way.
  const flowTop = niceStep(
    Math.max(1, ...weeks.flatMap((w) => [w.inCents, w.outCents])),
    1,
  );
  const yFlow = (cents: number) => 50 - (cents / flowTop) * 50;

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
  const months = weeks.filter(
    (w, i) => i > 0 && w.start.slice(0, 7) !== weeks[i - 1].start.slice(0, 7),
  );
  const span = (w: TreasuryWeek) => ({
    left: x(w.start),
    width: Math.max(x(w.end) - x(w.start) + 100 / (days + 1), 0.5),
  });

  function pick(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const at =
      Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1) * 100;
    const index = weeks.findIndex((w) => {
      const s = span(w);
      return at >= s.left && at <= s.left + s.width;
    });
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

  // The week under the pointer, through both bands.
  const highlight = shown && (
    <span
      aria-hidden
      className="absolute inset-y-0 bg-[var(--surface-soft)]"
      style={{ left: `${span(shown).left}%`, width: `${span(shown).width}%` }}
    />
  );
  const todayLine = todayIndex > 0 && (
    <line
      x1={x(today)}
      x2={x(today)}
      y1="0"
      y2="100"
      vectorEffect="non-scaling-stroke"
      strokeDasharray="2 4"
      className="stroke-[var(--text-tertiary)]"
    />
  );

  return (
    <div
      role="img"
      tabIndex={0}
      aria-label={t.summary(
        amount(points[todayIndex]?.cents ?? 0),
        amount(low.cents),
        formatShortDay(low.day, { bare: true }),
      )}
      className="flex touch-pan-y flex-col gap-6 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      onPointerLeave={() => setActive(null)}
      onBlur={() => setActive(null)}
      onKeyDown={key}
    >
      {/* The balance. */}
      <div className="flex gap-2">
        <Axis className={tall ? "h-60" : "h-48"}>
          {balanceTicks.map((tick) => (
            <span key={tick}>{formatAmountCompact(tick)}</span>
          ))}
        </Axis>
        <div
          className={cn("relative min-w-0 flex-1", tall ? "h-60" : "h-48")}
          onPointerMove={pick}
          onPointerDown={pick}
        >
          {highlight}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {balanceTicks.map((tick) => (
              <line
                key={tick}
                x1="0"
                x2="100"
                y1={yBalance(tick)}
                y2={yBalance(tick)}
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 4"
                className="stroke-[var(--border-default)]"
              />
            ))}
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
            {todayLine}
            <path
              d={stepPath(real)}
              fill="none"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              className="stroke-[var(--text-primary)]"
            />
            <path
              d={stepPath(forecast)}
              fill="none"
              strokeWidth={2}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
              className="stroke-[var(--text-primary)]"
            />
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
              style={{
                left: `${active > weeks.length / 2 ? span(shown).left : span(shown).left + span(shown).width}%`,
              }}
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
      </div>

      {/* Money in and out, a bar a week. */}
      <div className="flex gap-2">
        <Axis className="h-24">
          <span>{formatAmountCompact(flowTop)}</span>
          <span>0 €</span>
          <span>−{formatAmountCompact(flowTop)}</span>
        </Axis>
        <div
          className="relative h-24 min-w-0 flex-1"
          onPointerMove={pick}
          onPointerDown={pick}
        >
          {highlight}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <line
              x1="0"
              x2="100"
              y1="50"
              y2="50"
              vectorEffect="non-scaling-stroke"
              className="stroke-[var(--text-tertiary)]"
            />
            {todayLine}
            {weeks.map((w) => {
              const s = span(w);
              const bar = { x: s.left + s.width * 0.2, width: s.width * 0.6 };
              const realIn = w.inCents - w.inAheadCents;
              const realOut = w.outCents - w.outAheadCents;
              return (
                <g key={w.start}>
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
          </svg>
        </div>
      </div>

      {/* The months, and today. */}
      <div className="flex gap-2">
        <span aria-hidden className="w-14 shrink-0" />
        <div
          aria-hidden
          className="relative h-4 min-w-0 flex-1 text-caption text-[color:var(--text-secondary)]"
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
    </div>
  );
}

/** An axis's amounts, spread over its band. */
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
        "flex w-14 shrink-0 flex-col justify-between text-right text-caption text-[color:var(--text-secondary)] tabular-nums [&>span]:-translate-y-1/2 [&>span:first-child]:translate-y-0 [&>span:last-child]:translate-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
