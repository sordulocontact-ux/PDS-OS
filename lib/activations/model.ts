// Marketing › Activations: the closed lists, mirroring the database checks
// (supabase/migrations/20261011000101_marketing_activations.sql and the
// following ones). Client-safe.

export const ACTIVATION_KINDS = [
  "content",
  "influence",
  "press",
  "event",
  "other",
] as const;
export type ActivationKind = (typeof ACTIVATION_KINDS)[number];

/** Influence and RP run in house or through an agency without account. */
export const ACTIVATION_MODES = ["internal", "agency"] as const;
export type ActivationMode = (typeof ACTIVATION_MODES)[number];
export const kindHasMode = (kind: ActivationKind) =>
  kind === "influence" || kind === "press";

// « Prête » is computed (`launchGaps`); « Suspendue » keeps the status it
// interrupted and « Reprendre » returns to it (proto 18/10,
// supabase/migrations/20261019060101_activation_journey.sql).
export const ACTIVATION_STATUSES = [
  "to_prepare",
  "in_progress",
  "done_declared",
  "closed",
  "cancelled",
  "blocked",
  "suspended",
] as const;
export type ActivationStatus = (typeof ACTIVATION_STATUSES)[number];
/** The statuses a person sets by hand (« Clôturée » has its own action,
 * « Suspendre » / « Reprendre » theirs). */
export const SETTABLE_STATUSES = ACTIVATION_STATUSES.filter(
  (s) => s !== "closed" && s !== "suspended",
);
/** Those that need a written reason. */
export const REASONED_STATUSES: readonly ActivationStatus[] = [
  "cancelled",
  "blocked",
  "suspended",
];
/** Starting = from these to `STARTED_STATUSES`, refused by the database while
 * something of `LAUNCH_GAPS` is missing. */
export const NOT_STARTED_STATUSES: readonly ActivationStatus[] = [
  "to_prepare",
  "blocked",
];
export const STARTED_STATUSES: readonly ActivationStatus[] = [
  "in_progress",
  "done_declared",
];
export const LAUNCH_GAPS = ["owner", "due", "blocker", "dependency"] as const;
export type LaunchGap = (typeof LAUNCH_GAPS)[number];

export const PRIORITIES = ["high", "normal", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const EVIDENCE_KINDS = [
  "publication",
  "coverage",
  "broadcast",
  "interview",
  "other",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_SOURCES = [
  "internal",
  "creator",
  "agency",
  "media",
  "other",
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export const CHECK_RESULTS = ["verified", "contested", "unavailable"] as const;
export type CheckResult = (typeof CHECK_RESULTS)[number];

export const CHECK_METHODS = [
  "link_opened",
  "file_reviewed",
  "screenshot",
  "platform_stats",
  "other",
] as const;
export type CheckMethod = (typeof CHECK_METHODS)[number];

export const METRICS = [
  "views",
  "likes",
  "comments",
  "saves",
  "shares",
  "engagement_rate",
  "reach",
  "followers",
  "clicks",
  "streams",
  "other",
] as const;
export type Metric = (typeof METRICS)[number];

export const METRIC_UNITS = ["count", "percent", "eur"] as const;
export type MetricUnit = (typeof METRIC_UNITS)[number];

export const METRIC_SOURCES = [
  "agency",
  "creator",
  "internal",
  "platform",
  "media",
  "independent",
] as const;
export type MetricSource = (typeof METRIC_SOURCES)[number];

export const METRIC_VERIFICATIONS = [
  "declared",
  "verified",
  "contested",
] as const;
export type MetricVerification = (typeof METRIC_VERIFICATIONS)[number];

export const BLOCKER_CATEGORIES = [
  "internal",
  "external",
  "legal",
  "budget",
  "production",
  "validation",
  "evidence",
  "data",
] as const;
export type BlockerCategory = (typeof BLOCKER_CATEGORIES)[number];

export const SEVERITIES = ["low", "medium", "high"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const DEPENDENCY_KINDS = [
  "deliverable",
  "contract",
  "clearance",
  "task",
] as const;
export type DependencyKind = (typeof DEPENDENCY_KINDS)[number];

export const TARGET_OUTCOMES = [
  "closed",
  "refused",
  "no_response",
  "abandoned",
  "cancelled",
  "dispute",
  "declined",
] as const;
export type TargetOutcome = (typeof TARGET_OUTCOMES)[number];

export const MESSAGE_KINDS = [
  "brief",
  "proposal",
  "pitch",
  "follow_up",
  "agency_recap",
  "other",
] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MESSAGE_CHANNELS = ["email", "dm", "phone", "other"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_STATUSES = [
  "draft",
  "to_validate",
  "validated",
  "sent_declared",
  "cancelled",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const SHEET_STATUSES = [
  "draft",
  "to_validate",
  "validated",
  "changes_requested",
  "refused",
] as const;
export type SheetStatus = (typeof SHEET_STATUSES)[number];

export const FILE_KINDS = [
  "evidence",
  "agency_source",
  "agency_report",
  "invoice",
  "payment_proof",
  "content",
  "other",
] as const;
export type ActivationFileKind = (typeof FILE_KINDS)[number];
/** Invoices and payment proofs are read by the budget readers only. */
export const RESTRICTED_FILE_KINDS: readonly ActivationFileKind[] = [
  "invoice",
  "payment_proof",
];
export const ACTIVATION_FILE_BUCKET = "activation-files";
export const MAX_ACTIVATION_FILE_BYTES = 200 * 1024 * 1024;

export function asOf<T extends string>(
  list: readonly T[],
  value: unknown,
): T | null {
  return list.find((item) => item === value) ?? null;
}
