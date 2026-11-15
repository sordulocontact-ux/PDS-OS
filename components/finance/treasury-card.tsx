import { TreasuryChart } from "@/components/finance/treasury-chart";
import { StatementButton } from "@/components/finance/treasury-forms";
import { MetricCard, MetricCardLink } from "@/components/ui/metric-card";
import { routes } from "@/lib/auth/redirects";
import type { Treasury, TreasuryHorizon } from "@/lib/finance/treasury";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { treasury: treasuryText };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const day = (value: string) => formatShortDay(value, { bare: true });

// The swatches say how each line is drawn (TreasuryChart): solid, dashed,
// dotted amber.
const LEGEND = [
  { key: "real", swatch: "border-solid border-foreground" },
  { key: "forecast", swatch: "border-dashed border-foreground" },
  { key: "reserve", swatch: "border-dotted border-[var(--tone-warning-fg)]" },
] as const;

/**
 * The balance of the account and its curve, the main card of Finance (after
 * Midday's report cards, 13/11/2026): the balance large, what the forecast
 * says in one line, the legend, the curve. `detailed` (the Trésorerie page):
 * the money in and out of the period, the balance at the horizon and the
 * low point under the figure, the horizon's choice in `control`. Without any
 * statement of the account: what to do first.
 */
export function TreasuryCard({
  treasury,
  horizon,
  canManage,
  control,
  detailed = false,
}: {
  treasury: Treasury | null;
  horizon: TreasuryHorizon;
  canManage: boolean;
  control?: React.ReactNode;
  detailed?: boolean;
}) {
  const t = fr.treasury;
  const title = detailed ? t.page.balance.title : t.overview.balance.title;
  if (!treasury)
    return (
      <MetricCard
        title={title}
        value="—"
        size="lg"
        caption={
          canManage
            ? t.overview.noStatement.body
            : t.overview.noStatement.reader
        }
      >
        {canManage && (
          <div>
            <StatementButton first variant="default" />
          </div>
        )}
      </MetricCard>
    );

  const ahead = treasury.at(horizon);
  const delta = ahead - treasury.todayCents;
  const caption = detailed
    ? t.page.balance.caption(day(treasury.statement.asOf))
    : `${t.overview.balance.caption(day(treasury.statement.asOf))} · ${t.overview.balance.ahead(
        horizon,
        amount(ahead),
        t.overview.balance.signed(amount(Math.abs(delta)), delta >= 0),
      )}`;

  return (
    <MetricCard
      title={title}
      value={amount(treasury.todayCents)}
      size="lg"
      caption={caption}
      action={
        control ??
        (detailed ? undefined : (
          <MetricCardLink href={routes.financeTreasury}>
            {t.overview.balance.open}
          </MetricCardLink>
        ))
      }
      legend={
        <div className="flex flex-col gap-5">
          {detailed && <PeriodFigures treasury={treasury} horizon={horizon} />}
          <ul
            aria-label={t.chart.legend}
            className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-[color:var(--text-secondary)]"
          >
            {LEGEND.filter(
              (l) => l.key !== "reserve" || treasury.reserveCents > 0,
            ).map((l) => (
              <li key={l.key} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn("inline-block w-4 border-t-2", l.swatch)}
                />
                {l.key === "reserve"
                  ? `${t.chart.reserve} ${amount(treasury.reserveCents)}`
                  : t.chart[l.key]}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <TreasuryChart
        points={treasury.points}
        reserveCents={treasury.reserveCents}
        low={treasury.low}
        tall={detailed}
      />
    </MetricCard>
  );
}

/** The period in four figures, side by side under the balance (Trésorerie). */
function PeriodFigures({
  treasury,
  horizon,
}: {
  treasury: Treasury;
  horizon: TreasuryHorizon;
}) {
  const f = fr.treasury.page.figures;
  const sum = (direction: "in" | "out") =>
    treasury.events
      .filter((e) => e.direction === direction)
      .reduce((total, e) => total + e.cents, 0);
  const below =
    treasury.reserveCents > 0 && treasury.low.cents < treasury.reserveCents;
  const figures = [
    { label: f.in, value: `+${amount(sum("in"))}`, tone: "in" },
    { label: f.out, value: `−${amount(sum("out"))}` },
    { label: f.atHorizon(horizon), value: amount(treasury.at(horizon)) },
    {
      label: f.low,
      value: amount(treasury.low.cents),
      sub: below ? f.below : f.lowOn(day(treasury.low.day)),
      tone: below ? "warning" : undefined,
    },
  ];
  return (
    <dl
      aria-label={f.label}
      className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--border-hairline)] pt-4 sm:grid-cols-4"
    >
      {figures.map((x) => (
        <div key={x.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-caption text-[color:var(--text-secondary)]">
            {x.label}
          </dt>
          <dd
            className={`text-body-lg font-medium tabular-nums ${
              x.tone === "in"
                ? "text-[color:var(--tone-success-fg)]"
                : x.tone === "warning"
                  ? "text-[color:var(--tone-warning-fg)]"
                  : ""
            }`}
          >
            {x.value}
          </dd>
          {x.sub && (
            <dd className="text-caption text-[color:var(--text-secondary)]">
              {x.sub}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
