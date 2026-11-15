import type { ReactNode } from "react";

import { LinkRows, type LinkRow } from "@/components/finance/link-rows";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { orchardAdvances } from "@/lib/finance/engines";
import type { payLaterSummary } from "@/lib/finance/pay-later";
import { fundings } from "@/lib/i18n/fr/fundings";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { fundings };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const day = (value: string) => formatShortDay(value, { bare: true });
const UPCOMING = 5;

/** The day and the amount at the end of a row. */
function DayAmount({
  day: when,
  value,
  income = false,
}: {
  day: string;
  value: string;
  income?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-4 text-body-md whitespace-nowrap tabular-nums">
      <span className="text-[color:var(--text-secondary)]">{when}</span>
      <span className={income ? "text-[color:var(--tone-success-fg)]" : ""}>
        {value}
      </span>
    </span>
  );
}

/**
 * « The Orchard · avances » (proto « Financements »): the advance per
 * tranche, the titles counted toward the next one with their gauge, then
 * the advances the planned shows trigger. All read from the engine.
 */
export function OrchardCard({
  trancheCents,
  counted,
  orchard,
  action,
}: {
  trancheCents: number;
  counted: number;
  orchard: ReturnType<typeof orchardAdvances>;
  action?: ReactNode;
}) {
  const t = fr.fundings.orchard;
  const rows = orchard.advances.map((a, i): LinkRow => ({
    key: `${a.day}-${i}`,
    href: null,
    main: t.planned,
    sub: a.show ? t.plannedBy(a.show.label) : t.due,
    end: <DayAmount day={day(a.day)} value={amount(a.cents)} income />,
  }));
  return (
    <MetricCard
      title={t.title}
      value={amount(trancheCents)}
      caption={t.caption(orchard.per)}
      action={action}
    >
      <div className="flex flex-col gap-2">
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.countedLine(counted, orchard.per)}
        </p>
        <ProgressBar
          value={Math.min(counted, orchard.per)}
          max={orchard.per}
          label={t.counted(counted, orchard.per)}
        />
      </div>
      {rows.length === 0 ? (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.nextUnknown}
        </p>
      ) : (
        <LinkRows rows={rows} />
      )}
    </MetricCard>
  );
}

/**
 * « Pay Later » (proto): total credit, used and available, the next
 * installment with its interest and how many are paid, then the
 * installments to come. `children`: the buttons of the card.
 */
export function PayLaterCard({
  limitCents,
  usedCents,
  hasLines,
  summary,
  children,
}: {
  limitCents: number;
  usedCents: number;
  hasLines: boolean;
  summary: ReturnType<typeof payLaterSummary>;
  children?: ReactNode;
}) {
  const t = fr.fundings.payLater;
  const { next } = summary;
  const figures = [
    [t.figures.total, limitCents],
    [t.figures.used, usedCents],
    [t.figures.free, limitCents - usedCents],
  ] as const;
  const rows = summary.upcoming.slice(0, UPCOMING).map((x): LinkRow => ({
    key: x.key,
    href: null,
    main: t.installment(x.n, x.of),
    sub: x.label,
    end: <DayAmount day={day(x.day)} value={`−${amount(x.cents)}`} />,
  }));
  return (
    <MetricCard title={t.title}>
      {hasLines ? (
        <dl className="grid grid-cols-3 gap-4">
          {figures.map(([label, cents]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-caption text-[color:var(--text-secondary)]">
                {label}
              </dt>
              <dd className="m-0 text-body-lg tabular-nums">{amount(cents)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      )}
      {next && (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {[
            t.summary(amount(next.cents), amount(next.feeCents)),
            t.progress(summary.paid, summary.total),
            t.nextDay(day(next.day)),
          ].join(" · ")}
        </p>
      )}
      {hasLines &&
        (rows.length === 0 ? (
          <p className="text-body-md text-[color:var(--text-secondary)]">
            {t.noInstallments}
          </p>
        ) : (
          <LinkRows rows={rows} />
        ))}
      {children}
    </MetricCard>
  );
}
