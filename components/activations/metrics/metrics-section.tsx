import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MetricSource } from "@/lib/activations/model";
import { formatMetric, metricTotals } from "@/lib/activations/totals";
import type { ActivationScope, MetricRecord } from "@/lib/activations/types";
import { activations } from "@/lib/i18n/fr/activations";
import { formatShortDate, formatShortRange } from "@/lib/release/format";
import { cn } from "@/lib/utils";

import { MetricActions, RecordMetricButton } from "./metric-actions";
import { ReadStatsButton } from "./read-stats-button";

const fr = { activations };

const t = fr.activations.metrics;
const verificationTone = {
  declared: "action",
  verified: "success",
  contested: "danger",
} as const;

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";

/**
 * Statistics as dated, sourced snapshots, in few words (Sacha 10/11/2026:
 * « trop de texte »): the totals as tiles only when they add several
 * snapshots (one snapshot is its own total), then one row per snapshot —
 * metric with where and who it comes from, value, period, day and state,
 * its acts in « ⋯ ». The rules stay in the code: only compatible figures
 * add up, nothing missing is a zero. Typed by hand (« Noter un relevé ») or
 * read from the proofs' TikTok, YouTube and Deezer links (« Relever les
 * statistiques », `readable`).
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
  readable = [],
}: {
  scope: ActivationScope;
  metrics: MetricRecord[];
  canWrite: boolean;
  canVerify: boolean;
  today: string;
  targetId?: string | null;
  defaultSource?: MetricSource;
  title?: string;
  // The platforms PDS OS can read among the proofs (readablePlatforms).
  readable?: string[];
}) {
  const totals = metricTotals(metrics);
  const name = (m: Pick<MetricRecord, "metric" | "label">) =>
    m.label ?? t.names[m.metric];
  const period = (m: MetricRecord) =>
    m.periodStart && m.periodEnd
      ? formatShortRange(m.periodStart, m.periodEnd)
      : t.period(
          m.periodStart ? formatShortDate(m.periodStart) : null,
          m.periodEnd ? formatShortDate(m.periodEnd) : null,
        );
  return (
    <ActivationSection
      id="metrics"
      title={title}
      action={
        canWrite && (
          <span className="flex flex-wrap items-start justify-end gap-2">
            {readable.length > 0 && (
              <ReadStatsButton
                scope={scope}
                targetId={targetId}
                platforms={readable}
              />
            )}
            <RecordMetricButton
              scope={scope}
              targetId={targetId}
              defaultSource={defaultSource}
              today={today}
              variant={readable.length > 0 ? "ghost" : "outline"}
            />
          </span>
        )
      }
    >
      {metrics.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-4">
          {totals.some((total) => total.count > 1) && (
            <StatTiles
              stats={totals.map((total) => ({
                label: name(total),
                value:
                  total.value === null
                    ? t.notSummed
                    : formatMetric(total.value, total.unit),
                hint: t.totalHint(
                  total.count,
                  total.allVerified
                    ? t.verification.verified
                    : total.sources.map((s) => t.sources[s]).join(", "),
                ),
              }))}
            />
          )}
          <DataTable>
            <DataTableHeader>
              <DataTableHead>{t.metric}</DataTableHead>
              <DataTableHead align="end">{t.value}</DataTableHead>
              <DataTableHead fill hideBelow="lg">
                {t.periodLabel}
              </DataTableHead>
              <DataTableHead hideBelow="md">{t.collectedOn}</DataTableHead>
              <DataTableHead>{t.state}</DataTableHead>
              <DataTableHead className="w-px">
                <span className="sr-only">{t.actions}</span>
              </DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {metrics.map((m) => (
                <DataTableRow
                  key={m.id}
                  className={m.invalidatedAt ? "opacity-60" : undefined}
                >
                  <DataTableCell className="whitespace-normal">
                    <span className="flex flex-col">
                      {name(m)}
                      <span className={caption}>
                        {[m.platform, t.sources[m.source]]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </DataTableCell>
                  <DataTableCell align="end" className="tabular-nums">
                    {formatMetric(m.value, m.unit)}
                    {m.partial && (
                      <span className={cn(caption, "block")}>
                        {t.partialMark}
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell
                    fill
                    hideBelow="lg"
                    className="text-[color:var(--text-secondary)]"
                  >
                    {period(m)}
                  </DataTableCell>
                  <DataTableCell
                    hideBelow="md"
                    className="text-[color:var(--text-secondary)] tabular-nums"
                  >
                    {formatShortDate(m.collectedOn)}
                  </DataTableCell>
                  <DataTableCell>
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
                  </DataTableCell>
                  <DataTableCell align="end" className="w-px">
                    {!m.invalidatedAt && (canWrite || canVerify) && (
                      <MetricActions
                        projectId={scope.projectId}
                        metricId={m.id}
                        name={[name(m), m.platform].filter(Boolean).join(" · ")}
                        verification={m.verification}
                        canVerify={canVerify || canWrite}
                        canInvalidate={canWrite}
                      />
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      )}
    </ActivationSection>
  );
}
