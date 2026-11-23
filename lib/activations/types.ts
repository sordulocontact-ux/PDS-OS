// Marketing › Activations: the records read for the screens. Client-safe.

import type {
  ActivationKind,
  ActivationMode,
  ActivationStatus,
  BlockerCategory,
  CheckMethod,
  CheckResult,
  EvidenceKind,
  EvidenceSource,
  LaunchGap,
  Metric,
  MetricSource,
  MetricUnit,
  MetricVerification,
  Priority,
  Severity,
} from "@/lib/activations/model";
import type { DerivedProof } from "@/lib/activations/campaign";
import type { ActivationAction } from "@/lib/activations/journey";
import type {
  ActivationView,
  Alert,
  DependencyFact,
  MeasureState,
  ProofState,
  Reserve,
  RuleKey,
} from "@/lib/activations/states";

export type ActivationRecord = {
  id: string;
  projectId: string;
  kind: ActivationKind;
  mode: ActivationMode | null;
  title: string;
  description: string | null;
  objective: string | null;
  sourceKind: "manual" | "lever" | "deliverable" | "handoff";
  leverId: string | null;
  deliverableId: string | null;
  handoffId: string | null;
  ownerPersonId: string | null;
  priority: Priority;
  startsOn: string | null;
  dueOn: string | null;
  status: ActivationStatus;
  // The status a suspension interrupted, where « Reprendre » returns.
  statusBeforeSuspension: ActivationStatus | null;
  statusReason: string | null;
  evidenceExpected: boolean;
  metricsExpected: boolean;
  // « Donnée indisponible » : expected, and will not come.
  metricsUnavailable: boolean;
  closureKind: "definitive" | "with_reserves" | null;
  closureReserves: Reserve[] | null;
  closureNote: string | null;
  closedBy: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CheckRecord = {
  id: string;
  result: CheckResult;
  method: CheckMethod;
  note: string | null;
  checkedBy: string | null;
  checkedAt: string;
};

export type EvidenceRecord = {
  id: string;
  activationId: string;
  targetId: string | null;
  agencyRowId: string | null;
  kind: EvidenceKind;
  platform: string | null;
  url: string | null;
  fileId: string | null;
  declaredOn: string | null;
  declaredSource: EvidenceSource;
  note: string | null;
  withdrawnAt: string | null;
  withdrawnReason: string | null;
  createdBy: string | null;
  createdAt: string;
  // Newest first.
  checks: CheckRecord[];
};

export type MetricRecord = {
  id: string;
  activationId: string;
  targetId: string | null;
  agencyRowId: string | null;
  metric: Metric;
  label: string | null;
  value: number;
  unit: MetricUnit;
  platform: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  source: MetricSource;
  method: string | null;
  // « Relevé partiel » : not everything is counted yet.
  partial: boolean;
  collectedOn: string;
  verification: MetricVerification;
  invalidatedAt: string | null;
  invalidationReason: string | null;
  createdBy: string | null;
};

export type BlockerRecord = {
  id: string;
  activationId: string;
  category: BlockerCategory;
  description: string;
  blockingObject: string | null;
  ownerPersonId: string | null;
  severity: Severity;
  impact: string | null;
  expectedResolution: string | null;
  status: "open" | "resolved";
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type DependencyRecord = DependencyFact & {
  activationId: string;
  // Where to open it, when the screen has a page for it.
  href: string | null;
};

export type NextAction = {
  // « manual » or the rule's key.
  origin: string;
  label: string;
  reason: string | null;
  expectedPersonId: string | null;
  dueOn: string | null;
  taskId: string | null;
  // The stored row (a manual action, or a rule turned into a task).
  rowId: string | null;
  ruleKey: RuleKey | null;
};

export type ActivationSummary = ActivationRecord & {
  sourceLabel: string | null;
  // Influence and RP in house: the proof computed from the campaign.
  derived: DerivedProof | null;
  // Every gesture it waits for, the trunk's first, with its person
  // (lib/activations/journey.ts, actors.ts), for the person looking.
  actions: ActivationAction[];
  // What a gated one waits for (« Clip officiel livré »).
  waitsFor: string | null;
  // The latest statistic, for « Clôturée · 48 200 vues ».
  lastFigure: string | null;
  proof: ProofState;
  measure: MeasureState;
  alerts: Alert[];
  views: ActivationView[];
  blocked: boolean;
  next: NextAction | null;
  reserves: Reserve[];
  openBlockerCount: number;
  // What starting still needs; empty = « Prête ».
  launchGaps: LaunchGap[];
  lastChangeAt: string;
};

/** Where a client form writes: the upload path needs the organization. */
export type ActivationScope = {
  organizationId: string;
  projectId: string;
  activationId: string;
};
