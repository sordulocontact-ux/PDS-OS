// Marketing › Activations: every state of the overview computed by code from
// the facts, never stored (ticket « Vue d'ensemble et pilotage » : « Trois axes
// sont affichés séparément », « Une statistique n'est jamais déduite à zéro »).
// Pure functions, client-safe.

import {
  NOT_STARTED_STATUSES,
  type ActivationStatus,
  type BlockerCategory,
  type CheckResult,
  type DependencyKind,
  type LaunchGap,
  type MetricVerification,
  type Severity,
} from "@/lib/activations/model";

export type ProofState =
  | "not_expected"
  | "to_provide"
  | "provided_unverified"
  | "verified"
  | "contested"
  | "unavailable";

export type MeasureState =
  | "not_expected"
  | "to_collect"
  | "partial"
  | "available_declared"
  | "available_verified";

export type EvidenceFact = {
  id: string;
  targetId: string | null;
  withdrawn: boolean;
  // The latest check's result, null when never checked.
  lastCheck: CheckResult | null;
};

export type MetricFact = {
  targetId: string | null;
  agencyRowId: string | null;
  verification: MetricVerification;
  valid: boolean;
};

export type DependencyFact = {
  id: string;
  kind: DependencyKind;
  label: string;
  blocking: boolean;
  // null = its source cannot be read with this session.
  resolved: boolean | null;
  changed: boolean;
};

export type ActivationFacts = {
  status: ActivationStatus;
  ownerPersonId: string | null;
  dueOn: string | null;
  evidenceExpected: boolean;
  metricsExpected: boolean;
  evidences: EvidenceFact[];
  metrics: MetricFact[];
  // Targets still expected to produce something (no outcome other than
  // « closed »): a partial measure is one where some have no statistic.
  liveTargetIds: string[];
  // Targets with no outcome yet.
  openTargetCount: number;
  openBlockers: { id: string; description: string }[];
  dependencies: DependencyFact[];
};

const OPEN_WORK: readonly ActivationStatus[] = [
  "to_prepare",
  "in_progress",
  "blocked",
];

export const isOpen = (status: ActivationStatus) =>
  status !== "closed" && status !== "cancelled";

/**
 * What an activation still lacks to start (« Prête » when none), as the
 * database checks it (`activation_launch_gaps`) : an owner, a due date, no
 * open blocker, no blocking dependency unresolved. A dependency this session
 * cannot read is left to the database.
 */
export function launchGaps(f: ActivationFacts): LaunchGap[] {
  const gaps: LaunchGap[] = [];
  if (!f.ownerPersonId) gaps.push("owner");
  if (!f.dueOn) gaps.push("due");
  if (f.openBlockers.length > 0) gaps.push("blocker");
  if (f.dependencies.some((d) => d.blocking && d.resolved === false))
    gaps.push("dependency");
  return gaps;
}

/** An evidence's own state: its latest check, else not verified. */
export function evidenceState(e: EvidenceFact): ProofState {
  if (e.withdrawn) return "unavailable";
  return e.lastCheck ?? "provided_unverified";
}

export function proofState(f: ActivationFacts): ProofState {
  if (!f.evidenceExpected) return "not_expected";
  const live = f.evidences.filter((e) => !e.withdrawn);
  if (live.length === 0) return "to_provide";
  if (live.some((e) => e.lastCheck === "contested")) return "contested";
  if (live.some((e) => e.lastCheck === "unavailable")) return "unavailable";
  if (live.some((e) => e.lastCheck === null)) return "provided_unverified";
  return "verified";
}

export function measureState(f: ActivationFacts): MeasureState {
  if (!f.metricsExpected) return "not_expected";
  const valid = f.metrics.filter((m) => m.valid);
  if (valid.length === 0) return "to_collect";
  const measured = new Set(
    valid.flatMap((m) => (m.targetId ? [m.targetId] : [])),
  );
  if (f.liveTargetIds.some((id) => !measured.has(id))) return "partial";
  return valid.every((m) => m.verification === "verified")
    ? "available_verified"
    : "available_declared";
}

export type Alert = {
  key:
    | "owner_missing"
    | "overdue"
    | "proof_missing"
    | "proof_problem"
    | "metrics_missing"
    | "dependency_open"
    | "dependency_changed"
    | `module:${string}`;
  category: BlockerCategory;
  severity: Severity;
  // The object it is about (a dependency's label, a date), for the label.
  subject?: string;
  // Written by the module that raised it (agency divergence, ads rights…).
  text?: string;
};

const DEPENDENCY_CATEGORY: Record<DependencyKind, BlockerCategory> = {
  deliverable: "production",
  contract: "legal",
  clearance: "legal",
  task: "internal",
};

/** What deserves attention, computed: never a stored blocker. */
export function alertsOf(
  f: ActivationFacts,
  today: string,
  moduleAlerts: Alert[] = [],
): Alert[] {
  if (!isOpen(f.status)) return [];
  const alerts: Alert[] = [];
  if (!f.ownerPersonId)
    alerts.push({
      key: "owner_missing",
      category: "internal",
      severity: "medium",
    });
  if (f.dueOn && f.dueOn < today && OPEN_WORK.includes(f.status))
    alerts.push({
      key: "overdue",
      category: "internal",
      severity: "medium",
      subject: f.dueOn,
    });
  const proof = proofState(f);
  if (f.status === "done_declared" && proof === "to_provide")
    alerts.push({
      key: "proof_missing",
      category: "evidence",
      severity: "high",
    });
  if (proof === "contested" || proof === "unavailable")
    alerts.push({
      key: "proof_problem",
      category: "evidence",
      severity: "high",
    });
  if (f.status === "done_declared" && measureState(f) === "to_collect")
    alerts.push({
      key: "metrics_missing",
      category: "data",
      severity: "medium",
    });
  for (const d of f.dependencies) {
    if (d.blocking && d.resolved === false)
      alerts.push({
        key: "dependency_open",
        category: DEPENDENCY_CATEGORY[d.kind],
        severity: "high",
        subject: d.label,
      });
    if (d.changed)
      alerts.push({
        key: "dependency_changed",
        category: "data",
        severity: "low",
        subject: d.label,
      });
  }
  return [...alerts, ...moduleAlerts];
}

export const ACTIVATION_VIEWS = [
  "to_launch",
  "in_progress",
  "to_verify",
  "blocked",
  "to_measure",
  "ready_for_review",
  "closed",
] as const;
export type ActivationView = (typeof ACTIVATION_VIEWS)[number];

export function isBlocked(f: ActivationFacts, alerts: Alert[]): boolean {
  return (
    f.status === "blocked" ||
    f.openBlockers.length > 0 ||
    alerts.some((a) => a.key === "dependency_open")
  );
}

/** The views an activation belongs to: one may sit in several. */
export function viewsOf(f: ActivationFacts, alerts: Alert[]): ActivationView[] {
  const views: ActivationView[] = [];
  const proof = proofState(f);
  const measure = measureState(f);
  const blocked = isBlocked(f, alerts);
  if (!isOpen(f.status)) return ["closed"];
  if (f.status === "to_prepare") views.push("to_launch");
  if (f.status === "in_progress") views.push("in_progress");
  if (
    ["provided_unverified", "contested", "unavailable"].includes(proof) ||
    (f.status === "done_declared" && proof === "to_provide")
  )
    views.push("to_verify");
  if (blocked) views.push("blocked");
  if (
    f.status === "done_declared" &&
    (measure === "to_collect" || measure === "partial")
  )
    views.push("to_measure");
  if (f.status === "done_declared" && !blocked) views.push("ready_for_review");
  return views;
}

// `label`: the words shown at closure, kept with a stored reserve.
export type Reserve = { key: string; count?: number; label?: string };

/** The objective reserves of a closure or a report, listed by code. */
export function reservesOf(f: ActivationFacts): Reserve[] {
  const reserves: Reserve[] = [];
  const proof = proofState(f);
  if (proof === "to_provide") reserves.push({ key: "proof_missing" });
  if (proof === "provided_unverified")
    reserves.push({ key: "proof_unverified" });
  if (proof === "contested" || proof === "unavailable")
    reserves.push({ key: "proof_problem" });
  const measure = measureState(f);
  if (measure === "to_collect" || measure === "partial")
    reserves.push({ key: "metrics_missing" });
  if (measure === "available_declared")
    reserves.push({ key: "metrics_declared" });
  if (f.openBlockers.length > 0)
    reserves.push({ key: "open_blockers", count: f.openBlockers.length });
  if (f.openTargetCount > 0)
    reserves.push({ key: "open_targets", count: f.openTargetCount });
  return reserves;
}

export type RuleKey =
  | "owner_missing"
  | "due_missing"
  | "launch"
  | "blocker"
  | "dependency"
  | "overdue"
  | "evidence_missing"
  | "evidence_unverified"
  | "evidence_problem"
  | "metrics_missing"
  | "close"
  | `m_${string}`;

/** A recommendation: its rule, what it is about and why. A module step
 * (Influence, RP, agency) brings its own label and reason. */
export type RuleStep = {
  key: RuleKey;
  subject?: string;
  label?: string;
  reason?: string;
};

/**
 * The next action recommended by rules, in order of what unblocks the most:
 * an owner, a due date, what blocks, the module's own next step, the start
 * once nothing is missing, an overdue date, the proof, the statistics, then
 * the closure. Rules a person set aside are skipped.
 */
export function ruleSteps(
  f: ActivationFacts,
  today: string,
  moduleSteps: RuleStep[] = [],
): RuleStep[] {
  if (!isOpen(f.status)) return [];
  const steps: RuleStep[] = [];
  if (!f.ownerPersonId) steps.push({ key: "owner_missing" });
  const notStarted = NOT_STARTED_STATUSES.includes(f.status);
  if (notStarted && !f.dueOn) steps.push({ key: "due_missing" });
  for (const b of f.openBlockers)
    steps.push({ key: "blocker", subject: b.description });
  for (const d of f.dependencies)
    if (d.blocking && d.resolved === false)
      steps.push({ key: "dependency", subject: d.label });
  steps.push(...moduleSteps);
  if (f.status === "to_prepare" && launchGaps(f).length === 0)
    steps.push({ key: "launch" });
  if (f.dueOn && f.dueOn < today && OPEN_WORK.includes(f.status))
    steps.push({ key: "overdue", subject: f.dueOn });
  const proof = proofState(f);
  if (f.status === "done_declared" && proof === "to_provide")
    steps.push({ key: "evidence_missing" });
  if (proof === "provided_unverified")
    steps.push({ key: "evidence_unverified" });
  if (proof === "contested" || proof === "unavailable")
    steps.push({ key: "evidence_problem" });
  if (f.status === "done_declared" && measureState(f) === "to_collect")
    steps.push({ key: "metrics_missing" });
  if (f.status === "done_declared" && f.openBlockers.length === 0)
    steps.push({ key: "close" });
  return steps;
}

export const ruleOrigin = (key: RuleKey) => `rule:${key}`;
