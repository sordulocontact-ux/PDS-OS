// The objective reserves of an agency report, listed by code (ticket RP §
// 6.5 : « le système consigne automatiquement la liste des réserves
// objectives »). Client-safe.

import type { AgencyRowRecord } from "@/lib/activations/agency/queries";
import type { EvidenceRecord, MetricRecord } from "@/lib/activations/types";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";

const fr = { activationAgency };

const l = fr.activationAgency.report.reserveLabels;

export type AgencyReserve = { key: string; count?: number; label: string };

/** Rows still to examine, agency statuses ahead of PDS decisions, actions
 * declared (a video or coverage link) without a verified proof, statistics
 * missing or only declared. */
export function agencyReserves(
  rows: AgencyRowRecord[],
  divergent: number,
  evidences: EvidenceRecord[],
  metrics: MetricRecord[],
): AgencyReserve[] {
  const live = rows.filter((r) => !r.absentSince);
  const reserves: AgencyReserve[] = [];
  const toReview = live.filter((r) => r.pdsDecision === "to_review").length;
  if (toReview > 0)
    reserves.push({
      key: "to_review",
      count: toReview,
      label: l.to_review(toReview),
    });
  if (divergent > 0)
    reserves.push({
      key: "divergence",
      count: divergent,
      label: l.divergence(divergent),
    });
  const verified = new Set(
    evidences.flatMap((e) =>
      e.agencyRowId && e.checks[0]?.result === "verified"
        ? [e.agencyRowId]
        : [],
    ),
  );
  const unproven = live.filter(
    (r) =>
      (r.current.video_url || r.current.coverage_url) && !verified.has(r.id),
  ).length;
  if (unproven > 0)
    reserves.push({
      key: "unproven",
      count: unproven,
      label: l.unproven(unproven),
    });
  const valid = metrics.filter((m) => !m.invalidatedAt);
  if (valid.length === 0)
    reserves.push({ key: "no_metrics", label: l.no_metrics });
  else if (valid.some((m) => m.verification !== "verified"))
    reserves.push({ key: "metrics_declared", label: l.metrics_declared });
  return reserves;
}
