import { LinkRows, type LinkRow } from "@/components/finance/link-rows";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { orchardAdvances } from "@/lib/finance/engines";
import { markOrchardAdvanceReceived } from "@/lib/finance/funding-actions";
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

/** Three figures side by side, label above (Contrat · Reçu · Reste ; Crédit
 * total · Utilisé · Disponible). */
function CardFigures({
  figures,
}: {
  figures: readonly (readonly [string, number])[];
}) {
  return (
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
  );
}

/**
 * « The Orchard · avances » (proto « Financements », contract of Ibé's
 * 16/11/2026): the advance per tranche, the contract's total, received and
 * left, the titles counted toward the next advance with their gauge and
 * where they come from, then the advances: due now (« Avance reçue » for
 * the Finance) and those the planned shows trigger. All read from the
 * engine.
 */
export function OrchardCard({
  trancheCents,
  orchard,
  canManage,
}: {
  trancheCents: number;
  orchard: ReturnType<typeof orchardAdvances>;
  canManage: boolean;
}) {
  const t = fr.fundings.orchard;
  const outside = orchard.delivered - orchard.fromDistribution;
  const firstDue = orchard.advances.find((a) => a.show === null);
  const rows = orchard.advances.map((a, i): LinkRow => ({
    key: `${a.day}-${i}`,
    href: null,
    main: t.trancheOf(a.n + 1, orchard.tranches),
    sub: a.show ? t.plannedBy(a.show.label) : t.due,
    end: (
      <span className="flex items-center gap-4">
        <DayAmount day={day(a.day)} value={amount(a.cents)} income />
        {canManage && a === firstDue && (
          <ConfirmButton
            label={t.received}
            title={t.receivedTitle}
            body={t.receivedBody(amount(a.cents))}
            confirmLabel={t.receivedConfirm}
            pendingLabel={t.receivedPending}
            done={fr.fundings.done.received}
            run={markOrchardAdvanceReceived.bind(null, orchard.received)}
          />
        )}
      </span>
    ),
  }));
  return (
    <MetricCard
      title={t.title}
      value={amount(trancheCents)}
      caption={t.caption(orchard.per)}
    >
      {orchard.contractCents !== null && (
        <CardFigures
          figures={[
            [t.figures.contract, orchard.contractCents],
            [t.figures.received, orchard.receivedCents],
            [t.figures.left, orchard.leftCents ?? 0],
          ]}
        />
      )}
      {orchard.complete ? (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.complete}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-body-md text-[color:var(--text-secondary)]">
            {t.countedLine(orchard.counted, orchard.per)}
          </p>
          <ProgressBar
            value={Math.min(orchard.counted, orchard.per)}
            max={orchard.per}
            label={t.counted(orchard.counted, orchard.per)}
          />
          <p className="text-caption text-[color:var(--text-secondary)]">
            {t.origin(orchard.delivered, orchard.fromDistribution, outside)}
          </p>
        </div>
      )}
      {!orchard.complete &&
        (rows.length === 0 ? (
          <p className="text-body-md text-[color:var(--text-secondary)]">
            {t.nextUnknown}
          </p>
        ) : (
          <LinkRows rows={rows} />
        ))}
    </MetricCard>
  );
}

/**
 * « Pay Later » (proto): total credit, used and available, the next
 * installment with its interest and how many are paid, then the
 * installments to come.
 */
export function PayLaterCard({
  limitCents,
  usedCents,
  hasLines,
  summary,
}: {
  limitCents: number;
  usedCents: number;
  hasLines: boolean;
  summary: ReturnType<typeof payLaterSummary>;
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
        <CardFigures figures={figures} />
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
    </MetricCard>
  );
}
