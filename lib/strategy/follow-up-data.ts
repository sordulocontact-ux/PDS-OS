import "server-only";

import { designStateOf, versionStatusOf } from "@/lib/design/rules";
import type { DesignState } from "@/lib/design/rules";
import { todayInParis } from "@/lib/insights/dates";
import { deliveryStateOf, type DeliveryState } from "@/lib/production/rules";
import {
  followUpGroups,
  type FollowUpGroup,
  type FollowUpInput,
} from "@/lib/strategy/follow-up";
import { kpiRows, type KpiRow } from "@/lib/strategy/follow-up-results";
import { loadKpiActuals } from "@/lib/strategy/kpi-actuals";
import type { StrategyData } from "@/lib/strategy/queries";
import {
  recommendations,
  type Recommendation,
} from "@/lib/strategy/recommendations";
import {
  settledRecommendations,
  type SettledRecommendation,
} from "@/lib/strategy/settled-recommendations";
import { createClient } from "@/lib/supabase/server";

export type FollowUpData = {
  today: string;
  referenceDate: string | null;
  // The release date is reached: the results replace the watch list.
  released: boolean;
  groups: FollowUpGroup[];
  kpis: KpiRow[];
  recommendations: Recommendation[];
  // Applied or ignored, newest first: what was said then, and what became
  // of it — the task's state as the Travail shows it, or the reason.
  settled: SettledRecommendation[];
};

const DOC_KINDS = ["brief", "release_plan", "press_kit"] as const;
type DocKind = (typeof DOC_KINDS)[number];
const isDocKind = (value: string): value is DocKind =>
  (DOC_KINDS as readonly string[]).includes(value);

/**
 * Everything the follow-up compares, read with the user's session (RLS):
 * the Conception and Production states of each deliverable, the tasks, the
 * strategy documents and pending stage validations, the KPIs' real values
 * (noted by a person, or read from Deezer after the release) and the
 * recommendations already settled. The rules are in lib/strategy/follow-up*.
 */
export async function loadFollowUp(
  projectId: string,
  projectTitle: string,
  data: StrategyData,
): Promise<FollowUpData> {
  const supabase = await createClient();
  const today = todayInParis();
  const [
    versions,
    deliveries,
    tasks,
    docs,
    stages,
    measures,
    settled,
    actuals,
  ] = await Promise.all([
    supabase
      .from("design_versions")
      .select("deliverable_id, status")
      .eq("project_id", projectId)
      .order("number", { ascending: false }),
    supabase
      .from("deliverable_deliveries")
      .select(
        "deliverable_id, final_url, final_note, approved_at, checked_at, delivered_at",
      )
      .eq("project_id", projectId),
    supabase
      .from("tasks")
      .select("status, due_date")
      .eq("project_id", projectId),
    supabase
      .from("strategy_documents")
      .select("kind, version, state, strategy_document_reviews(state)")
      .eq("project_id", projectId)
      .order("version", { ascending: false }),
    supabase
      .from("project_stages")
      .select("id, stage_definitions!inner(key), validations(state)")
      .eq("project_id", projectId),
    supabase
      .from("strategy_kpi_measures")
      .select("objective_id, value, measured_on, source_note")
      .eq("project_id", projectId)
      .order("measured_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("strategy_recommendations")
      .select(
        "id, rule_key, state, level, summary, reason, created_at, created_by, tasks(id, title, status, due_date, assignee_person_id)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    loadKpiActuals(projectId, data.referenceDate, data.objectives),
  ]);

  const design: Record<string, DesignState> = {};
  for (const v of versions.data ?? [])
    if (v.deliverable_id && !(v.deliverable_id in design))
      design[v.deliverable_id] = designStateOf({
        status: versionStatusOf(v.status),
      });
  const delivery: Record<string, DeliveryState> = {};
  for (const d of deliveries.data ?? [])
    delivery[d.deliverable_id] = deliveryStateOf({
      finalUrl: d.final_url,
      finalNote: d.final_note,
      approvedAt: d.approved_at,
      checkedAt: d.checked_at,
      deliveredAt: d.delivered_at,
    });

  const input: FollowUpInput = {
    today,
    levers: data.levers,
    deliverables: data.deliverables,
    milestones: data.milestones,
    design,
    delivery,
    tasks: tasks.data ?? [],
    documents: (docs.data ?? []).flatMap((d) =>
      isDocKind(d.kind)
        ? [
            {
              kind: d.kind,
              version: d.version,
              state: d.state,
              pendingReviews: d.strategy_document_reviews.filter(
                (r) => r.state === "pending",
              ).length,
            },
          ]
        : [],
    ),
    // The strategy's own validation goes through its documents.
    pendingStages: (stages.data ?? [])
      .filter(
        (s) =>
          s.stage_definitions.key !== "launch_strategy" &&
          s.stage_definitions.key !== "framing" &&
          s.validations.some((v) => v.state === "pending"),
      )
      .map((s) => s.stage_definitions.key),
  };

  const kpis = kpiRows(
    data.objectives,
    (measures.data ?? []).map((m) => ({ ...m, value: Number(m.value) })),
    actuals,
  );
  return {
    today,
    referenceDate: data.referenceDate,
    released: data.referenceDate !== null && data.referenceDate <= today,
    groups: followUpGroups(input),
    kpis,
    recommendations: recommendations({
      projectTitle,
      referenceDate: data.referenceDate,
      kpis,
      input,
      settled: new Set((settled.data ?? []).map((s) => s.rule_key)),
    }),
    settled: settledRecommendations(settled.data ?? [], data.members),
  };
}
