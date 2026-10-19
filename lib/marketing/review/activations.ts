import "server-only";

import { cache } from "react";

import { requireApproved } from "@/lib/auth/dal";
import { loadMembers } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

import {
  measureOf,
  proofOf,
  type RawActivationStatus,
  type ReviewActivation,
} from "./phase";

const STATUSES: readonly string[] = [
  "draft",
  "to_prepare",
  "ready",
  "in_progress",
  "done_declared",
  "closed",
  "cancelled",
  "suspended",
  "blocked",
];
const isStatus = (v: string): v is RawActivationStatus => STATUSES.includes(v);

/**
 * The project's activations as the Suivi & bilan reads them (phase.ts):
 * the Activations' tables as they are, with the viewer's session (RLS
 * decides), once per request.
 */
export const loadReviewActivations = cache(
  async (projectId: string): Promise<ReviewActivation[]> => {
    const [supabase, access] = await Promise.all([
      createClient(),
      requireApproved(),
    ]);
    const [acts, evidence, checks, metrics, members] = await Promise.all([
      supabase
        .from("marketing_activations")
        .select(
          "id, title, status, status_reason, owner_person_id, starts_on, due_on, evidence_expected, metrics_expected, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at"),
      supabase
        .from("activation_evidence")
        .select("id, activation_id")
        .eq("project_id", projectId)
        .is("withdrawn_at", null),
      supabase
        .from("activation_evidence_checks")
        .select("evidence_id, result, checked_at")
        .eq("project_id", projectId)
        .order("checked_at", { ascending: false }),
      supabase
        .from("activation_metrics")
        .select("activation_id, verification")
        .eq("project_id", projectId)
        .is("invalidated_at", null),
      loadMembers(access),
    ]);
    for (const res of [acts, evidence, checks, metrics])
      if (res.error) console.error("loadReviewActivations:", res.error.message);
    const lastCheck = new Map<string, string>();
    for (const c of checks.data ?? [])
      if (!lastCheck.has(c.evidence_id)) lastCheck.set(c.evidence_id, c.result);
    const nameOf = (id: string | null) =>
      members.find((m) => m.personId === id)?.name ?? null;
    return (acts.data ?? []).flatMap((a) => {
      if (!isStatus(a.status)) return [];
      const records = {
        status: a.status,
        evidenceExpected: a.evidence_expected,
        metricsExpected: a.metrics_expected,
        evidence: (evidence.data ?? [])
          .filter((e) => e.activation_id === a.id)
          .map((e) => ({ lastCheck: lastCheck.get(e.id) ?? null })),
        metrics: (metrics.data ?? []).filter((m) => m.activation_id === a.id),
      };
      return [
        {
          id: a.id,
          title: a.title,
          status: a.status,
          reason: a.status_reason,
          ownerName: nameOf(a.owner_person_id),
          hasOwner: a.owner_person_id !== null,
          hasDue: a.due_on !== null,
          startsOn: a.starts_on ?? a.created_at.slice(0, 10),
          proof: proofOf(records),
          measure: measureOf(records),
        },
      ];
    });
  },
);
