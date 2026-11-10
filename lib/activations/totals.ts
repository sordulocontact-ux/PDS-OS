// Totals of statistics, computed by code (ticket Influence : « PO
// n'additionne pas silencieusement des périodes ou définitions
// incompatibles »). Client-safe.

import { autoLinkOf } from "@/lib/activations/stats-links";
import type { MetricRecord } from "@/lib/activations/types";

export type MetricTotal = {
  metric: MetricRecord["metric"];
  label: string | null;
  unit: MetricRecord["unit"];
  // null when the figures cannot be added (rates).
  value: number | null;
  count: number;
  allVerified: boolean;
  sources: MetricRecord["source"][];
};

// An automatic snapshot belongs to its link too: two videos of one
// collaboration add up instead of the latest hiding the other.
const subjectOf = (m: MetricRecord) =>
  [
    m.targetId ?? m.agencyRowId ?? "activation",
    autoLinkOf(m.method) ?? "",
  ].join("|");

/**
 * The latest valid snapshot of each subject (a collaboration, an agency row
 * or the activation itself, and the link of an automatic one) and metric, then one total per metric and unit.
 * A percentage is never summed; an invalidated snapshot never counts.
 */
export function metricTotals(metrics: MetricRecord[]): MetricTotal[] {
  const latest = new Map<string, MetricRecord>();
  for (const m of metrics) {
    if (m.invalidatedAt) continue;
    const key = [subjectOf(m), m.metric, m.label ?? "", m.unit].join("|");
    const kept = latest.get(key);
    if (!kept || m.collectedOn > kept.collectedOn) latest.set(key, m);
  }
  const groups = new Map<string, MetricRecord[]>();
  for (const m of latest.values()) {
    const key = [m.metric, m.label ?? "", m.unit].join("|");
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups.values()].map((list) => ({
    metric: list[0].metric,
    label: list[0].label,
    unit: list[0].unit,
    value:
      list[0].unit === "percent" && list.length > 1
        ? null
        : list.reduce((sum, m) => sum + m.value, 0),
    count: list.length,
    allVerified: list.every((m) => m.verification === "verified"),
    sources: [...new Set(list.map((m) => m.source))],
  }));
}

const numbers = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function formatMetric(
  value: number,
  unit: MetricRecord["unit"],
): string {
  if (unit === "percent") return `${numbers.format(value)}\u00a0%`;
  if (unit === "eur") return `${numbers.format(value)}\u00a0€`;
  return numbers.format(value);
}
