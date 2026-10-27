import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MetricSource } from "@/lib/activations/model";
import { formatMetric, metricTotals } from "@/lib/activations/totals";
import type { ActivationScope, MetricRecord } from "@/lib/activations/types";
import { activations } from "@/lib/i18n/fr/activations";
import { formatShortDate } from "@/lib/release/format";

import { MetricActions, RecordMetricButton } from "./metric-actions";

const fr = { activations };

const t = fr.activations.metrics;
const verificationTone = {
  declared: "action",
  verified: "success",
  contested: "danger",
} as const;

/**
 * Statistics as dated, sourced snapshots ; the totals add only compatible
 * figures (same metric and unit, latest valid snapshot of each subject) and
 * say whether they are verified. Nothing missing is shown as zero.
 */
export function MetricsSection({
  scope,
  metrics,
  canWrite,
  canVerify,
  today,
  targetId = null,
  defaultSource,
  title = t.title,
}: {
  scope: ActivationScope;
  metrics: MetricRecord[];
  canWrite: boolean;
  canVerify: boolean;
  today: string;
  targetId?: string | null;
  defaultSource?: MetricSource;
  title?: string;
}) {
  const totals = metricTotals(metrics);
  const name = (m: Pick<MetricRecord, "metric" | "label">) =>
    m.label ?? t.names[m.metric];
  return (
    <PageSection
      id="metrics"
      title={title}
      description={t.description}
      action={
        canWrite && (
          <RecordMetricButton
            scope={scope}
            targetId={targetId}
            defaultSource={defaultSource}
            today={today}
          />
        )
      }
    >
      {metrics.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">{t.totalsTitle}</h3>
            <ul className="flex flex-wrap gap-2">
              {totals.map((total) => (
                <li
                  key={`${total.metric}-${total.label}-${total.unit}`}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {name(total)} ·{" "}
                  </span>
                  <span className="font-medium tabular-nums">
                    {total.value === null
                      ? t.notSummed
                      : t.totalValue(
                          formatMetric(total.value, total.unit),
                          total.count,
                        )}
                  </span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {total.allVerified
                      ? t.verification.verified
                      : total.sources.map((s) => t.sources[s]).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t.totalsRule}</p>
          </div>
          <DataTable>
            <DataTableHeader>
              <DataTableHead>{t.metric}</DataTableHead>
              <DataTableHead align="end">{t.value}</DataTableHead>
              <DataTableHead hideBelow="md">{t.source}</DataTableHead>
              <DataTableHead hideBelow="lg">{t.periodStart}</DataTableHead>
              <DataTableHead fill>{t.collectedOn}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {metrics.map((m) => (
                <DataTableRow
                  key={m.id}
                  className={m.invalidatedAt ? "opacity-60" : undefined}
                >
                  <DataTableCell>
                    <span className="flex flex-col">
                      {name(m)}
                      <span className="text-xs text-muted-foreground">
                        {m.platform}
                      </span>
                    </span>
                  </DataTableCell>
                  <DataTableCell align="end" className="tabular-nums">
                    {formatMetric(m.value, m.unit)}
                    {m.partial && (
                      <span className="text-[length:var(--type-micro)] text-[color:var(--text-tertiary)]">
                        {" "}
                        · {t.partialMark}
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell hideBelow="md">
                    {t.sources[m.source]}
                  </DataTableCell>
                  <DataTableCell hideBelow="lg">
                    {t.period(
                      m.periodStart ? formatShortDate(m.periodStart) : null,
                      m.periodEnd ? formatShortDate(m.periodEnd) : null,
                    )}
                  </DataTableCell>
                  <DataTableCell fill>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        {formatShortDate(m.collectedOn)}
                        <StatusBadge
                          size="sm"
                          tone={
                            m.invalidatedAt
                              ? "neutral"
                              : verificationTone[m.verification]
                          }
                        >
                          {m.invalidatedAt
                            ? t.invalidatedLabel
                            : t.verification[m.verification]}
                        </StatusBadge>
                      </span>
                      {!m.invalidatedAt && (canWrite || canVerify) && (
                        <MetricActions
                          projectId={scope.projectId}
                          metricId={m.id}
                          verification={m.verification}
                          canVerify={canVerify || canWrite}
                          canInvalidate={canWrite}
                        />
                      )}
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      )}
    </PageSection>
  );
}
