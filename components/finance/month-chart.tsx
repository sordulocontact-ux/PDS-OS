import { MonthChartTable } from "@/components/finance/month-chart-table";
import { PageSection } from "@/components/shell/page-section";
import type { MonthBar } from "@/lib/finance/aggregate";
import type { Month } from "@/lib/finance/period";
import { finance } from "@/lib/i18n/fr/finance";
import { cn } from "@/lib/utils";
import { formatAmount, formatAmountCompact } from "@/lib/utils/money";

const fr = { finance };

// The three states, bottom to top: what is paid in ink, what is engaged and
// not paid in mid grey, what is only estimated in light grey (the --chart-*
// ramp, redefined for the dark theme). Ordered states, one hue: the legend
// and the table say which is which, never the grey alone.
export const SERIES = [
  { key: "paidCents", label: "paid", swatch: "bg-chart-5" },
  { key: "unpaidCents", label: "unpaid", swatch: "bg-chart-3" },
  { key: "estimatedCents", label: "estimated", swatch: "bg-chart-1" },
] as const;

export const monthName = (month: Month, style: "short" | "long") =>
  new Intl.DateTimeFormat("fr-FR", {
    month: style,
    ...(style === "long" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));

/** A round top for the axis: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

const total = (bar: MonthBar) =>
  bar.paidCents + bar.unpaidCents + bar.estimatedCents;

/**
 * « Dépenses par mois » of the Finance page: one stacked bar per month (payé,
 * engagé pas encore payé, estimé), the months of the chosen period in full
 * ink, the others dimmed. Hover or focus a month: its three amounts. The same
 * figures in a table for screen readers. Drawn on the server, no library.
 */
export function MonthChart({
  bars,
  highlight,
}: {
  bars: MonthBar[];
  // The months of the chosen period (all of them when null).
  highlight: { from: Month; to: Month } | null;
}) {
  const t = fr.finance.chart;
  const top = niceMax(Math.max(0, ...bars.map(total)));
  const ticks = [top, top / 2, 0];
  const empty = bars.every((bar) => total(bar) === 0);
  const inPeriod = (month: Month) =>
    !highlight || (month >= highlight.from && month <= highlight.to);

  return (
    <PageSection
      id="finance-chart"
      title={t.title}
      action={
        <ul
          aria-label={t.legendLabel}
          className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-[color:var(--text-secondary)]"
        >
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn("size-2.5 rounded-xs", s.swatch)}
              />
              {t[s.label]}
            </li>
          ))}
        </ul>
      }
    >
      <figure className="flex flex-col gap-2">
        <div className="flex gap-2" aria-hidden={empty || undefined}>
          {/* The axis: three amounts, the gridlines drawn by the plot. */}
          <div className="flex h-56 w-12 shrink-0 flex-col justify-between text-right text-caption text-[color:var(--text-tertiary)] tabular-nums">
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
              {bars.map((bar, index) => {
                const sum = total(bar);
                // Opened toward the plot, never past the page's edge.
                const fromRight = index >= bars.length / 2;
                return (
                  <li
                    key={bar.month}
                    tabIndex={sum > 0 ? 0 : -1}
                    aria-label={`${monthName(bar.month, "long")} : ${SERIES.map(
                      (s) => `${t[s.label]} ${formatAmount(bar[s.key])}`,
                    ).join(", ")}`}
                    className={cn(
                      "group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      !inPeriod(bar.month) && "opacity-40",
                    )}
                  >
                    <div
                      className="flex w-full max-w-8 flex-col-reverse gap-0.5"
                      style={{ height: `${(sum / top) * 100}%` }}
                    >
                      {SERIES.map((s) =>
                        bar[s.key] > 0 ? (
                          <span
                            key={s.key}
                            className={cn(
                              "min-h-0 w-full basis-0 last:rounded-t-xs",
                              s.swatch,
                            )}
                            style={{ flexGrow: bar[s.key] }}
                          />
                        ) : null,
                      )}
                    </div>
                    {sum > 0 && (
                      <span
                        aria-hidden
                        className={cn(
                          "invisible absolute bottom-full z-10 mb-2 flex w-max flex-col gap-1 rounded-lg border border-border bg-popover p-2.5 text-caption text-popover-foreground shadow-md group-hover:visible group-focus-visible:visible",
                          fromRight ? "right-0" : "left-0",
                        )}
                      >
                        <span className="font-semibold capitalize">
                          {monthName(bar.month, "long")}
                        </span>
                        {SERIES.map((s) => (
                          <span key={s.key} className="flex items-center gap-2">
                            <span
                              className={cn("size-2 rounded-xs", s.swatch)}
                            />
                            <span className="flex-1">{t[s.label]}</span>
                            <span className="tabular-nums">
                              {formatAmount(bar[s.key], { ht: false })}
                            </span>
                          </span>
                        ))}
                        <span className="flex justify-between gap-4 border-t border-[color:var(--border-hairline)] pt-1 font-semibold">
                          {t.total}
                          <span className="tabular-nums">
                            {formatAmount(sum)}
                          </span>
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <ol
              aria-hidden
              className="mt-2 flex gap-1 text-center text-caption text-[color:var(--text-tertiary)] sm:gap-2"
            >
              {bars.map((bar) => (
                <li key={bar.month} className="min-w-0 flex-1 truncate">
                  <span className="sm:hidden">
                    {monthName(bar.month, "short").charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">
                    {monthName(bar.month, "short")}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        {empty && (
          <figcaption className="text-body-md text-muted-foreground">
            {t.empty}
          </figcaption>
        )}
        <MonthChartTable bars={bars} series={SERIES} monthName={monthName} />
      </figure>
    </PageSection>
  );
}
