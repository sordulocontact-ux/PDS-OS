import "server-only";

import type { Access } from "@/lib/auth/access";
import {
  BRIEF_TEXT_FIELDS,
  STRATEGY_TEXT_FIELDS,
  toBriefField,
  toFieldState,
  type BriefFieldState,
  type Provenance,
  type StrategyFieldState,
  type StrategyTextField,
} from "@/lib/framing/brief";
import { provenanceLookup } from "@/lib/framing/provenance";
import {
  loadImportableReports,
  loadMembers,
  loadPendingValidation,
  loadValidators,
  type ImportableReport,
  type Member,
  type PendingValidation,
} from "@/lib/framing/related";
import { referenceDate } from "@/lib/strategy/calendar";
import {
  choicesKey,
  suggestionsKey,
  toChoiceValue,
  toSuggestions,
  type ChoiceSuggestion,
  type ChoiceValue,
} from "@/lib/strategy/choices";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type Lever = Tables["levers"]["Row"] & {
  provenance: Provenance | null;
  needLabel: string | null;
};
export type StrategyDeliverable = Tables["strategy_deliverables"]["Row"];
export type Milestone = Tables["milestones"]["Row"];
export type OpenNeed = { id: string; label: string; family: string };

export type StrategyData = {
  stage: { id: string; state: string } | null;
  briefValidated: boolean;
  pendingValidation: PendingValidation | null;
  fields: StrategyFieldState[];
  // Closed-choice answers per text field, and PO's pending pre-checks.
  choices: Record<StrategyTextField, ChoiceValue>;
  suggestions: Record<StrategyTextField, ChoiceSuggestion[]>;
  brief: BriefFieldState[];
  levers: Lever[];
  // Confirmed Brief needs no lever answers yet: the starting point.
  openNeeds: OpenNeed[];
  deliverables: StrategyDeliverable[];
  milestones: Milestone[];
  referenceDate: string | null;
  reports: ImportableReport[];
  members: Member[];
  validators: Member[];
};

/** Everything the strategy page shows, read with the user's session (RLS). */
export async function loadStrategy(
  projectId: string,
  access: Access,
): Promise<StrategyData | null> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, organization_id, due_date")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const [
    stagesRes,
    fieldsRes,
    leversRes,
    needsRes,
    deliverablesRes,
    milestonesRes,
    releaseRes,
    members,
    reports,
    validators,
  ] = await Promise.all([
    supabase
      .from("project_stages")
      .select("id, state, stage_definitions!inner(key)")
      .eq("project_id", projectId)
      .in("stage_definitions.key", ["framing", "launch_strategy"]),
    supabase
      .from("current_field_values")
      .select("*")
      .eq("project_id", projectId)
      .in("deliverable", ["brief", "strategy"]),
    supabase
      .from("levers")
      .select("*")
      .eq("project_id", projectId)
      .neq("review_status", "rejected")
      .order("created_at"),
    supabase
      .from("needs")
      .select("id, label, family")
      .eq("project_id", projectId)
      .eq("review_status", "confirmed")
      .order("created_at"),
    supabase
      .from("strategy_deliverables")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("occurs_on")
      .order("created_at"),
    supabase
      .from("releases")
      .select("planned_release_date")
      .eq("project_id", projectId)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    loadMembers(access),
    loadImportableReports(projectId, "strategy"),
    loadValidators(project.organization_id),
  ]);

  const stages = stagesRes.data ?? [];
  const stageRow = stages.find(
    (s) => s.stage_definitions.key === "launch_strategy",
  );
  const stage = stageRow ? { id: stageRow.id, state: stageRow.state } : null;
  const briefValidated = stages.some(
    (s) => s.stage_definitions.key === "framing" && s.state === "validated",
  );

  const fieldRows = fieldsRes.data ?? [];
  const levers = leversRes.data ?? [];
  const needs = needsRes.data ?? [];
  const rowOf = (deliverable: string, key: string) =>
    fieldRows.find(
      (r) => r.deliverable === deliverable && r.field_key === key,
    ) ?? undefined;

  const strategyRows = fieldRows.filter((r) => r.deliverable === "strategy");
  const [provenanceOf, pendingValidation] = await Promise.all([
    provenanceLookup([...strategyRows, ...levers], members),
    loadPendingValidation(stage?.id ?? null, members),
  ]);

  const needLabel = new Map(needs.map((n) => [n.id, n.label]));
  const answered = new Set(levers.map((l) => l.need_id));

  return {
    stage,
    briefValidated,
    pendingValidation,
    fields: STRATEGY_TEXT_FIELDS.map((key) => {
      const row = rowOf("strategy", key);
      return toFieldState("strategy", key, row, row ? provenanceOf(row) : null);
    }),
    choices: Object.fromEntries(
      STRATEGY_TEXT_FIELDS.map((key) => [
        key,
        toChoiceValue(key, rowOf("strategy", choicesKey(key))?.value),
      ]),
    ) as Record<StrategyTextField, ChoiceValue>,
    suggestions: Object.fromEntries(
      STRATEGY_TEXT_FIELDS.map((key) => {
        const row = rowOf("strategy", suggestionsKey(key));
        return [
          key,
          row?.status === "proposed" ? toSuggestions(key, row.value) : [],
        ];
      }),
    ) as Record<StrategyTextField, ChoiceSuggestion[]>,
    // Read-only reminder: no provenance needed here.
    brief: BRIEF_TEXT_FIELDS.map((key) =>
      toBriefField(key, rowOf("brief", key), null),
    ),
    levers: levers.map((l) => ({
      ...l,
      provenance: provenanceOf(l),
      needLabel: l.need_id ? (needLabel.get(l.need_id) ?? null) : null,
    })),
    openNeeds: needs.filter((n) => !answered.has(n.id)),
    deliverables: deliverablesRes.data ?? [],
    milestones: milestonesRes.data ?? [],
    referenceDate: referenceDate(
      releaseRes.data?.planned_release_date ?? null,
      project.due_date,
    ),
    reports,
    members,
    validators,
  };
}
