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
 * their amount above; the months to come lighter, as they are forecast.
 * Each month says its two amounts to a screen reader. Drawn on the server.
 */
export function FlowBars({ flows }: { flows: MonthFlow[] }) {
  const top = niceMax(
    Math.max(0, ...flows.flatMap((f) => [f.inCents, f.outCents])),
  );
  const empty = flows.every((f) => !f.inCents && !f.outCents);
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
        <ol className="flex h-64 items-end gap-2 border-b border-[color:var(--border-hairline)] pt-5">
          {flows.map((f) => {
            const label = monthName(f.month, "short");
            return (
              <li
                key={f.month}
                aria-label={t.month(
                  monthName(f.month, "long"),
                  formatAmount(f.inCents, { ht: false }),
                  formatAmount(f.outCents, { ht: false }),
                  f.ahead,
                )}
                className={cn(
                  "relative flex h-full min-w-0 flex-1 flex-col justify-end",
                  f.ahead && "opacity-60",
                )}
              >
                <span
                  aria-hidden
                  className="flex h-full items-end justify-center gap-1"
                >
                  <Bar cents={f.inCents} top={top} className="bg-foreground" />
                  <Bar cents={f.outCents} top={top} className={OUT} />
                </span>
                <span
                  aria-hidden
                  className="absolute top-full mt-2 w-full text-center text-caption text-[color:var(--text-secondary)]"
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {!empty && <span aria-hidden className="block h-6" />}
    </MetricCard>
  );
}

/** One bar, its amount above it (compact). */
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
    <span className="flex h-full w-full max-w-6 flex-col items-center justify-end gap-1">
      {cents > 0 && (
        <span className="text-micro text-[color:var(--text-secondary)] tabular-nums">
          {formatAmountCompact(cents)}
        </span>
      )}
      <span
        className={cn("w-full rounded-t-xs", className)}
        style={{
          height: `calc(${(cents / top) * 100}% - 1.25rem)`,
          minHeight: cents > 0 ? 2 : 0,
        }}
      />
    </span>
  );
}
