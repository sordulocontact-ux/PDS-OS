import { monthName, niceMax } from "@/components/finance/month-chart";
import { MetricCard } from "@/components/ui/metric-card";
import type { MonthFlow } from "@/lib/finance/flows";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { cn } from "@/lib/utils";
import { formatAmount, formatAmountCompact } from "@/lib/utils/money";

const t = treasuryText.flows;

// Money out hatched, as the proto: the two bars read apart without colour.
const OUT =
  "border border-[color:var(--border-default)] [background:repeating-linear-gradient(135deg,var(--border-default)_0_1px,transparent_1px_5px)]";

/**
 * « Entrées et sorties » of Trésorerie (after the proto's Rapports page,
 * Sacha 15/11/2026): two bars a month, money in in ink, money out hatched,
 * the months to come lighter, as they are forecast; three amounts on the
 * axis with their grid lines. Hover or focus a month: its two amounts
 * (Sacha 17/11/2026: the amounts written above the bars ran into each
 * other, more so on a year). Each month says them to a screen reader too.
 * Drawn on the server.
 */
export function FlowBars({ flows }: { flows: MonthFlow[] }) {
  const top = niceMax(
    Math.max(0, ...flows.flatMap((f) => [f.inCents, f.outCents])),
  );
  const ticks = [top, top / 2, 0];
  const empty = flows.every((f) => !f.inCents && !f.outCents);
  const amount = (cents: number) => formatAmount(cents, { ht: false });
  return (
    <MetricCard
      title={t.title}
      legend={
        <ul
          aria-label={t.legend}
          className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-[color:var(--text-secondary)]"
        >
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-xs bg-foreground" />
            {t.in}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-xs", OUT)} />
            {t.out}
          </li>
        </ul>
      }
    >
      {empty ? (
        <p className="text-body-sm text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      ) : (
        <div className="flex gap-2">
          <div
            aria-hidden
            className="flex h-56 w-12 shrink-0 flex-col justify-between text-right text-caption text-[color:var(--text-secondary)] tabular-nums"
          >
            {ticks.map((tick) => (
              <span key={tick} className="-translate-y-1/2 last:translate-y-0">
                {formatAmountCompact(tick)}
              </span>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 flex h-56 flex-col justify-between"
            >
              {ticks.map((tick) => (
                <span
                  key={tick}
                  className="border-t border-[color:var(--border-hairline)]"
                />
              ))}
            </div>
            <ol className="relative flex h-56 items-end gap-1 sm:gap-2">
              {flows.map((f, index) => {
                // Opened toward the plot, never past the card's edge.
                const fromRight = index >= flows.length / 2;
                return (
                  <li
                    key={f.month}
                    tabIndex={0}
                    aria-label={t.month(
                      monthName(f.month, "long"),
                      amount(f.inCents),
                      amount(f.outCents),
                      f.ahead,
                    )}
                    className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:gap-1"
                  >
                    <Bar
                      cents={f.inCents}
                      top={top}
                      className={cn("bg-foreground", f.ahead && "opacity-60")}
                    />
                    <Bar
                      cents={f.outCents}
                      top={top}
                      className={cn(OUT, f.ahead && "opacity-60")}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "invisible absolute bottom-full z-10 mb-2 flex w-max flex-col gap-1 rounded-lg border border-border bg-popover p-2.5 text-caption text-popover-foreground shadow-md group-hover:visible group-focus-visible:visible",
                        fromRight ? "right-0" : "left-0",
                      )}
                    >
                      <span className="font-semibold capitalize">
                        {monthName(f.month, "long")}
                        {f.ahead && ` · ${t.ahead}`}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-xs bg-foreground" />
                        <span className="flex-1">{t.in}</span>
                        <span className="tabular-nums">
                          {amount(f.inCents)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-xs", OUT)} />
                        <span className="flex-1">{t.out}</span>
                        <span className="tabular-nums">
                          {amount(f.outCents)}
                        </span>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <ol
              aria-hidden
              className="mt-2 flex gap-1 text-center text-caption text-[color:var(--text-secondary)] sm:gap-2"
            >
              {flows.map((f, i) => (
                <li
                  key={f.month}
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    f.ahead && "text-[color:var(--text-tertiary)]",
                    // A year's sixteen months: every other name on a phone.
                    flows.length > 8 && i % 2 === 1 && "max-sm:invisible",
                  )}
                >
                  {monthName(f.month, "short")}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </MetricCard>
  );
}

/** One bar, as tall as its amount. */
function Bar({
  cents,
  top,
  className,
}: {
  cents: number;
  top: number;
  className: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("w-full max-w-7 rounded-t-xs", className)}
      style={{
        height: `${(cents / top) * 100}%`,
        minHeight: cents > 0 ? 2 : 0,
      }}
    />
  );
}
