import { PageSection } from "@/components/shell/page-section";
import type {
  AgencyRowRecord,
  AgencySourceRecord,
} from "@/lib/activations/agency/queries";
import {
  formatMetric,
  metricTotals,
  type MetricTotal,
} from "@/lib/activations/totals";
import type { MetricRecord } from "@/lib/activations/types";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations, activationAgency };

const t = fr.activationAgency;

function Totals({ totals }: { totals: MetricTotal[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {totals.map((x) => (
        <li
          key={`${x.metric}-${x.unit}`}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <span className="text-muted-foreground">
            {fr.activations.metrics.names[x.metric]} ·{" "}
          </span>
          <span className="font-medium tabular-nums">
            {x.value === null
              ? fr.activations.metrics.notSummed
              : formatMetric(x.value, x.unit)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The results by source (an artist's tab, a plan) and in total, added by
 * code from the latest valid snapshot of each agency row ; always labelled
 * « données agence » unless every figure was verified independently.
 */
export function ReportSynthesis({
  sources,
  rows,
  metrics,
}: {
  sources: AgencySourceRecord[];
  rows: AgencyRowRecord[];
  metrics: MetricRecord[];
}) {
  const fromRows = metrics.filter((m) => m.agencyRowId);
  if (fromRows.length === 0) return null;
  const sourceOf = new Map(rows.map((r) => [r.id, r.sourceId]));
  const total = metricTotals(fromRows);
  const verified = total.every((x) => x.allVerified);
  return (
    <PageSection
      id="synthesis"
      title={t.report.synthesis}
      description={t.report.synthesisDescription}
      card
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">
          {verified
            ? fr.activations.metrics.verification.verified
            : `${t.agencyData}, ${t.notVerified}`}
        </p>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm text-muted-foreground">{t.report.bySource}</h3>
          {sources.map((s) => {
            const mine = fromRows.filter(
              (m) => sourceOf.get(m.agencyRowId ?? "") === s.id,
            );
            return mine.length === 0 ? null : (
              <div key={s.id} className="flex flex-col gap-1">
                <span className="text-sm font-medium">{s.label}</span>
                <Totals totals={metricTotals(mine)} />
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm text-muted-foreground">{t.report.total}</h3>
          <Totals totals={total} />
        </div>
      </div>
    </PageSection>
  );
}
