// The review reads the activations' evidence and statistics through
// marketing_review_evidence (20261011000601), which keeps their codes; the
// names shown are the Activations' own (lib/i18n/fr/activations.ts). Pure,
// client-safe.

import { activations } from "@/lib/i18n/fr/activations";
import type { EvidenceKind } from "@/lib/marketing/model";

const fr = { activations };

const evidenceSources: Record<string, string> = fr.activations.evidence.sources;
const metricSources: Record<string, string> = fr.activations.metrics.sources;
const metricNames: Record<string, string> = fr.activations.metrics.names;
const units: Record<string, string> = { percent: "%", eur: "€" };

/** Who declared an evidence or a statistic, in words. */
export function reviewSourceName(
  kind: EvidenceKind,
  source: string | null,
): string | null {
  if (!source) return null;
  const names = kind === "statistic" ? metricSources : evidenceSources;
  return names[source] ?? source;
}

/** A statistic's metric in words, with its unit when it is not a count
 * (a rate and a count of the same metric are never added up together). */
export function reviewMetricName(
  metric: string | null,
  unit: string | null,
): string | null {
  if (!metric) return null;
  const name = metricNames[metric] ?? metric;
  return unit && units[unit] ? `${name} (${units[unit]})` : name;
}
