// A Marketing report version (ticket « Suivi & bilan », écran 2;
// supabase/migrations/20261011000201_marketing_reports.sql): its snapshot
// read back into the same shapes as the live data, so the figures of a
// version are computed by the same code, with the rules of its version.
// Pure, client-safe.

import {
  computeDashboard,
  type Dashboard,
  type ReserveFact,
} from "@/lib/marketing/dashboard";
import {
  isActivationKind,
  isActivationStatus,
  isAvailability,
  isEvidenceKind,
  isVerification,
  type Activation,
  type Evidence,
} from "@/lib/marketing/model";

export const REPORT_SECTIONS = [
  "summary",
  "objectives",
  "activations",
  "results",
  "statistics",
  "budget",
  "reserves",
  "annexes",
] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

export const RESERVE_CATEGORIES = [
  "links",
  "statistics",
  "coverage",
  "activations",
  "payments",
  "rights",
  "evidence",
  "other",
] as const;
export type ReserveCategory = (typeof RESERVE_CATEGORIES)[number];

export const REPORT_STATES = [
  "generated",
  "to_validate",
  "approved_provisional",
  "changes_requested",
  "postponed",
  "superseded",
  "finalized",
] as const;
export type ReportState = (typeof REPORT_STATES)[number];

// The validator's decisions on a submitted version (écran 3).
export const APPROVAL_DECISIONS = [
  "approved_provisional",
  "changes_requested",
  "postponed",
] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export const isReportSection = (v: unknown): v is ReportSection =>
  (REPORT_SECTIONS as readonly unknown[]).includes(v);
export const isReserveCategory = (v: unknown): v is ReserveCategory =>
  (RESERVE_CATEGORIES as readonly unknown[]).includes(v);
export const isReportState = (v: unknown): v is ReportState =>
  (REPORT_STATES as readonly unknown[]).includes(v);

export type SnapshotReserve = {
  id: string;
  category: ReserveCategory;
  description: string;
  activationId: string | null;
};

export type ReportSnapshot = {
  projectTitle: string;
  generatedAt: string;
  period: { start: string | null; end: string | null };
  sections: ReportSection[];
  summary: string | null;
  recommendations: string | null;
  activations: Activation[];
  evidence: Evidence[];
  excluded: { id: string; title: string }[];
  objectives: {
    strategic: string | null;
    kpis: {
      label: string;
      kind: string;
      target: number | null;
      unit: string | null;
      dueOn: string | null;
    }[];
  };
  reserves: SnapshotReserve[];
};

export type ReportBudget = {
  plannedCents: number;
  committedCents: number;
  paidCents: number;
};

export type ReportVersion = {
  id: string;
  version: number;
  state: ReportState;
  periodStart: string | null;
  periodEnd: string | null;
  activationIds: string[];
  sections: ReportSection[];
  rulesVersion: number;
  contentHash: string;
  createdAt: string;
  authorPersonId: string | null;
  authorName: string | null;
  submittedAt: string | null;
  submitterPersonId: string | null;
  submitterName: string | null;
};

type Json = unknown;
const obj = (v: Json): Record<string, Json> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, Json>)
    : {};
const arr = (v: Json): Json[] => (Array.isArray(v) ? v : []);
const str = (v: Json): string | null =>
  typeof v === "string" && v !== "" ? v : null;
const num = (v: Json): number | null =>
  typeof v === "number"
    ? v
    : typeof v === "string" && v !== "" && !Number.isNaN(Number(v))
      ? Number(v)
      : null;

/** The stored snapshot, read defensively (unknown values are dropped). */
export function parseSnapshot(raw: Json): ReportSnapshot {
  const s = obj(raw);
  const activations: Activation[] = arr(s.activations).flatMap((v) => {
    const a = obj(v);
    const id = str(a.id);
    if (!id || !isActivationKind(a.kind) || !isActivationStatus(a.status))
      return [];
    return [
      {
        id,
        title: str(a.title) ?? "",
        kind: a.kind,
        status: a.status,
        ownerPersonId: null,
        ownerName: str(a.owner_name),
        deliverableId: null,
        deliverableTitle: str(a.deliverable_title),
        leverId: null,
        leverLabel: str(a.lever_label),
        startsOn: str(a.starts_on),
        endsOn: str(a.ends_on),
        note: null,
        // Archived since: the report keeps it, the figures count it.
        archivedAt: null,
        createdAt: str(a.created_at) ?? "",
      },
    ];
  });
  const evidence: Evidence[] = arr(s.evidence).flatMap((v) => {
    const e = obj(v);
    const id = str(e.id);
    const activationId = str(e.activation_id);
    if (
      !id ||
      !activationId ||
      !isEvidenceKind(e.kind) ||
      !isVerification(e.verification)
    )
      return [];
    return [
      {
        id,
        activationId,
        kind: e.kind,
        label: str(e.label) ?? "",
        url: str(e.url),
        platform: str(e.platform),
        metric: str(e.metric),
        value: num(e.value),
        periodStart: str(e.period_start),
        periodEnd: str(e.period_end),
        availability: isAvailability(e.availability) ? e.availability : null,
        reportedBy: str(e.reported_by),
        observedOn: str(e.observed_on),
        verification: e.verification,
        verifiedAt: str(e.verified_at),
        verifiedByName: str(e.verified_by_name),
        linkUnreachableAt: str(e.link_unreachable_at),
        archivedAt: null,
        createdAt: str(e.created_at) ?? "",
      },
    ];
  });
  const objectives = obj(s.objectives);
  const period = obj(s.period);
  return {
    projectTitle: str(obj(s.project).title) ?? "",
    generatedAt: str(s.generated_at) ?? "",
    period: { start: str(period.start), end: str(period.end) },
    sections: arr(s.sections).filter(isReportSection),
    summary: str(s.summary),
    recommendations: str(s.recommendations),
    activations,
    evidence,
    excluded: arr(s.excluded_activations).flatMap((v) => {
      const a = obj(v);
      const id = str(a.id);
      return id ? [{ id, title: str(a.title) ?? "" }] : [];
    }),
    objectives: {
      strategic: str(objectives.strategic),
      kpis: arr(objectives.kpis).map((v) => {
        const k = obj(v);
        return {
          label: str(k.label) ?? "",
          kind: str(k.kind) ?? "quantitative",
          target: num(k.target),
          unit: str(k.unit),
          dueOn: str(k.due_on),
        };
      }),
    },
    reserves: arr(s.reserves).flatMap((v) => {
      const r = obj(v);
      const id = str(r.id);
      if (!id || !isReserveCategory(r.category)) return [];
      return [
        {
          id,
          category: r.category,
          description: str(r.description) ?? "",
          activationId: str(r.activation_id),
        },
      ];
    }),
  };
}

/**
 * The figures of a version, computed from its snapshot with the rules of its
 * version. Only version 1 exists; a later rule change adds its own branch
 * here so older reports keep being read with theirs.
 */
export function reportFigures(
  snapshot: ReportSnapshot,
  rulesVersion: number,
  budget: ReportBudget | null,
): Dashboard {
  if (rulesVersion !== 1)
    throw new Error(`unknown_rules_version_${rulesVersion}`);
  const reserves: ReserveFact[] = snapshot.reserves.map((r) => ({
    id: r.id,
    activationId: r.activationId,
    state: "open",
  }));
  return computeDashboard({
    activations: snapshot.activations,
    evidence: snapshot.evidence,
    reserves,
    budget,
    budgetRestricted: budget === null,
  });
}
