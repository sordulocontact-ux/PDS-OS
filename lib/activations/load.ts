import "server-only";

import { cache } from "react";

import { asOf, CHECK_METHODS, CHECK_RESULTS } from "@/lib/activations/model";
import type { Reserve } from "@/lib/activations/states";
import type {
  ActivationRecord,
  BlockerRecord,
  EvidenceRecord,
  MetricRecord,
} from "@/lib/activations/types";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Tables = Database["public"]["Tables"];
type ActivationRow = Tables["marketing_activations"]["Row"];

export function toActivation(r: ActivationRow): ActivationRecord {
  return {
    id: r.id,
    projectId: r.project_id,
    kind: r.kind as ActivationRecord["kind"],
    mode: r.mode as ActivationRecord["mode"],
    title: r.title,
    description: r.description,
    objective: r.objective,
    sourceKind: r.source_kind as ActivationRecord["sourceKind"],
    leverId: r.lever_id,
    deliverableId: r.deliverable_id,
    handoffId: r.handoff_id,
    ownerPersonId: r.owner_person_id,
    priority: r.priority as ActivationRecord["priority"],
    startsOn: r.starts_on,
    dueOn: r.due_on,
    status: r.status as ActivationRecord["status"],
    statusBeforeSuspension:
      r.status_before_suspension as ActivationRecord["statusBeforeSuspension"],
    statusReason: r.status_reason,
    evidenceExpected: r.evidence_expected,
    metricsExpected: r.metrics_expected,
    closureKind: r.closure_kind as ActivationRecord["closureKind"],
    closureReserves: Array.isArray(r.closure_reserves)
      ? (r.closure_reserves as Reserve[])
      : null,
    closureNote: r.closure_note,
    closedBy: r.closed_by,
    closedAt: r.closed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Everything the overview needs about a project's activations, read in one
 * round with the user's session (RLS decides what is visible). Cached per
 * request: the overview, a fiche's layout and its page share it. */
export const loadActivationData = cache(async (projectId: string) => {
  const supabase = await createClient();
  const [acts, targets, evidence, checks, metrics, blockers, deps, nexts] =
    await Promise.all([
      supabase
        .from("marketing_activations")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at"),
      supabase
        .from("activation_targets")
        .select("id, activation_id, contact_id, outcome")
        .eq("project_id", projectId),
      supabase
        .from("activation_evidence")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at"),
      supabase
        .from("activation_evidence_checks")
        .select("id, evidence_id, result, method, note, checked_by, checked_at")
        .eq("project_id", projectId)
        .order("checked_at", { ascending: false }),
      supabase
        .from("activation_metrics")
        .select("*")
        .eq("project_id", projectId)
        .order("collected_on", { ascending: false }),
      supabase
        .from("activation_blockers")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at"),
      supabase
        .from("activation_dependencies")
        .select(
          "id, activation_id, kind, deliverable_id, contract_id, clearance_id, task_id, blocking, observed",
        )
        .eq("project_id", projectId),
      supabase
        .from("activation_next_actions")
        .select(
          "id, activation_id, origin, label, expected_person_id, due_on, status, task_id, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ]);
  const failed = [
    acts,
    targets,
    evidence,
    checks,
    metrics,
    blockers,
    deps,
    nexts,
  ]
    .map((r) => r.error)
    .find(Boolean);
  // A failed read is not « nothing »: the error page offers to retry.
  if (failed) throw new Error(`loadActivationData: ${failed.message}`);

  const checksOf = new Map<string, EvidenceRecord["checks"]>();
  for (const c of checks.data ?? []) {
    const list = checksOf.get(c.evidence_id) ?? [];
    list.push({
      id: c.id,
      result: asOf(CHECK_RESULTS, c.result) ?? "contested",
      method: asOf(CHECK_METHODS, c.method) ?? "other",
      note: c.note,
      checkedBy: c.checked_by,
      checkedAt: c.checked_at,
    });
    checksOf.set(c.evidence_id, list);
  }

  const evidences: EvidenceRecord[] = (evidence.data ?? []).map((e) => ({
    id: e.id,
    activationId: e.activation_id,
    targetId: e.target_id,
    agencyRowId: e.agency_row_id,
    kind: e.kind as EvidenceRecord["kind"],
    platform: e.platform,
    url: e.url,
    fileId: e.file_id,
    declaredOn: e.declared_on,
    declaredSource: e.declared_source as EvidenceRecord["declaredSource"],
    note: e.declaration_note,
    withdrawnAt: e.withdrawn_at,
    withdrawnReason: e.withdrawn_reason,
    createdBy: e.created_by,
    createdAt: e.created_at,
    checks: checksOf.get(e.id) ?? [],
  }));

  const metricRecords: MetricRecord[] = (metrics.data ?? []).map((m) => ({
    id: m.id,
    activationId: m.activation_id,
    targetId: m.target_id,
    agencyRowId: m.agency_row_id,
    metric: m.metric as MetricRecord["metric"],
    label: m.label,
    value: Number(m.value),
    unit: m.unit as MetricRecord["unit"],
    platform: m.platform,
    periodStart: m.period_start,
    periodEnd: m.period_end,
    source: m.source as MetricRecord["source"],
    method: m.method,
    collectedOn: m.collected_on,
    verification: m.verification as MetricRecord["verification"],
    invalidatedAt: m.invalidated_at,
    invalidationReason: m.invalidation_reason,
    createdBy: m.created_by,
  }));

  const blockerRecords: BlockerRecord[] = (blockers.data ?? []).map((b) => ({
    id: b.id,
    activationId: b.activation_id,
    category: b.category as BlockerRecord["category"],
    description: b.description,
    blockingObject: b.blocking_object,
    ownerPersonId: b.owner_person_id,
    severity: b.severity as BlockerRecord["severity"],
    impact: b.impact,
    expectedResolution: b.expected_resolution,
    status: b.status as BlockerRecord["status"],
    resolutionNote: b.resolution_note,
    resolvedBy: b.resolved_by,
    resolvedAt: b.resolved_at,
    createdAt: b.created_at,
  }));

  return {
    activations: (acts.data ?? []).map(toActivation),
    targets: targets.data ?? [],
    evidences,
    metrics: metricRecords,
    blockers: blockerRecords,
    dependencies: deps.data ?? [],
    nextActions: nexts.data ?? [],
  };
});

export type ActivationData = Awaited<ReturnType<typeof loadActivationData>>;
