// The anomalies of a release (ticket « Distribution » § 9, CA12): what is
// wrong, how serious, and in which module it is corrected — never in
// Distribution itself, which then prepares a new version of the dossier.
// Pure.

import { routes } from "@/lib/auth/redirects";
import { distributionStepHref } from "@/lib/ui/distribution-steps";
import { masterStepHref } from "@/lib/ui/master-steps";

export const ANOMALY_KINDS = [
  "wrong_audio",
  "metadata",
  "credit_isrc",
  "cover",
  "platform_unavailable",
  "territory_rights",
  "date",
  "other",
] as const;
export type AnomalyKind = (typeof ANOMALY_KINDS)[number];

export const SEVERITIES = ["minor", "major", "blocking"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ANOMALY_STATES = [
  "open",
  "in_correction",
  "resolved",
  "dismissed",
] as const;
export type AnomalyState = (typeof ANOMALY_STATES)[number];

export const ANOMALY_MODULES = [
  "catalog",
  "master",
  "legal",
  "design",
  "project",
  "distribution",
  "distributor",
] as const;
export type AnomalyModule = (typeof ANOMALY_MODULES)[number];

/** Where an anomaly of each kind is usually corrected (a default, changed
 * by the person who reports it). */
export const DEFAULT_MODULE: Record<AnomalyKind, AnomalyModule> = {
  wrong_audio: "master",
  metadata: "catalog",
  credit_isrc: "catalog",
  cover: "design",
  platform_unavailable: "distributor",
  territory_rights: "legal",
  date: "project",
  other: "distribution",
};

/** The screen of the owner module where the correction is made. */
export function moduleHref(
  module: AnomalyModule,
  input: { projectId: string; firstMasterId: string | null },
): string {
  const { projectId, firstMasterId } = input;
  switch (module) {
    case "catalog":
      return firstMasterId ? routes.master(firstMasterId) : routes.masters;
    case "master":
      return masterStepHref(projectId, "final");
    case "legal":
      return routes.projectLegal(projectId);
    case "design":
      return routes.projectDesign(projectId);
    case "project":
      return routes.project(projectId);
    case "distribution":
      return distributionStepHref(projectId, "params");
    case "distributor":
      return distributionStepHref(projectId, "orchard");
  }
}

export type Anomaly = {
  id: string;
  version: number | null;
  kind: AnomalyKind;
  description: string;
  platform: string | null;
  severity: Severity;
  module: AnomalyModule;
  state: AnomalyState;
  stateNote: string | null;
  reportedBy: string | null;
  reportedAt: string;
  stateBy: string | null;
  stateAt: string | null;
  // Declared from The Orchard's corrections (declare_distribution_corrections).
  fromDistributor: boolean;
};

export const isOpen = (anomaly: Anomaly) =>
  anomaly.state === "open" || anomaly.state === "in_correction";

/** Open ones first (blocking, then major), then the closed ones. */
export function sortAnomalies(anomalies: Anomaly[]): Anomaly[] {
  const weight = (a: Anomaly) =>
    (isOpen(a) ? 0 : 10) + (2 - SEVERITIES.indexOf(a.severity));
  return [...anomalies].sort(
    (a, b) => weight(a) - weight(b) || b.reportedAt.localeCompare(a.reportedAt),
  );
}
