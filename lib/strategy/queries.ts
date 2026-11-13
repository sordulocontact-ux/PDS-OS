import "server-only";

import type {
  ActionTitleScope,
  ScopeTitle,
} from "@/lib/projects/title-scope-rules";
import { loadTitleScopes } from "@/lib/projects/title-scopes";
import type { Access } from "@/lib/auth/access";
import {
  BRIEF_TEXT_FIELDS,
  NARRATIVE_PARTS,
  NARRATIVE_SUMMARY,
  POSITIONING_PARTS,
  STRATEGIC_OBJECTIVE,
  STRATEGY_TEXT_FIELDS,
  toBriefField,
  toFieldState,
  type FieldState,
  type NarrativePart,
  type PositioningPart,
  type Provenance,
  type StrategyFieldState,
  type StrategyTextField,
} from "@/lib/framing/brief";
import { provenanceLookup } from "@/lib/framing/provenance";
import { fr } from "@/lib/i18n/fr";
import {
  loadImportableReports,
  loadMembers,
  loadPendingValidation,
  loadValidators,
  type ImportableReport,
  type Member,
  type PendingValidation,
} from "@/lib/framing/related";
import { answerOf } from "@/lib/framing/assess";
import { referenceDate } from "@/lib/strategy/calendar";
import { answerWithChoices } from "@/lib/strategy/compose";
import {
  choicesKey,
  suggestionsKey,
  toChoiceValue,
  toSuggestions,
  type ChoiceSuggestion,
  type ChoiceValue,
} from "@/lib/strategy/choices";
import { personName } from "@/lib/projects/types";
import { isLegalItem } from "@/lib/strategy/legal-items";
import { createClient } from "@/lib/supabase/server";
import { snapshotOf, type BriefSnapshot } from "@/lib/framing/brief-snapshot";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type Lever = Tables["levers"]["Row"] & {
  provenance: Provenance | null;
  needLabel: string | null;
};
export type StrategyDeliverable = Tables["strategy_deliverables"]["Row"];
export type Milestone = Tables["milestones"]["Row"];
export type StrategyObjective = Tables["strategy_objectives"]["Row"];
export type StrategyAudience = Tables["strategy_audiences"]["Row"];
// The Cadrage's objective, as confirmed there (MKT-S1-13): its words and,
// when it was said measurably, the metric, the target and the horizon.
export type FramingObjective = {
  text: string | null;
  // The success criterion's measures, one KPI each (Ibé 01/11/2026).
  measures: { metric: string; target: number; period: string }[];
};
export type OpenNeed = { id: string; label: string; family: string };
export type LegalDependency = {
  id: string;
  label: string;
  status: string;
  dueOn: string | null;
  responsibleName: string | null;
};

export type StrategyData = {
  stage: { id: string; state: string } | null;
  // The owner opened the work (« Commencer la stratégie », or a strategy
  // call processed): until then, the page is the entry.
  started: boolean;
  // Call reports of the project: sources PO can lean on.
  callReportCount: number;
  briefValidated: boolean;
  pendingValidation: PendingValidation | null;
  fields: StrategyFieldState[];
  // The story parts of the narrative (its angle is the `narrative` field).
  narrativeParts: FieldState<NarrativePart>[];
  // MKT-S1-06: the narrative in one text, drafted by PO.
  narrativeSummary: FieldState;
  // The positioning in four parts (MKT-S1-05) and the publics, row by row.
  positioningParts: FieldState<PositioningPart>[];
  audiences: StrategyAudience[];
  framingObjective: FramingObjective;
  // What the release must accomplish (« Objectifs & KPIs »), then its KPIs.
  strategicObjective: FieldState<typeof STRATEGIC_OBJECTIVE>;
  objectives: StrategyObjective[];
  envelopeToConfirm: boolean;
  // Closed-choice answers per text field, and PO's pending pre-checks.
  choices: Record<StrategyTextField, ChoiceValue>;
  suggestions: Record<StrategyTextField, ChoiceSuggestion[]>;
  // The Brief the strategy builds on: the validated version's objective and
  // timing, as the validator read them; never a proposal set aside in the
  // Cadrage (UX test of 09/10/2026: « Sortie début mars » came back).
  brief: BriefReminderLine[];
  levers: Lever[];
  // Confirmed Brief needs no lever answers yet: the starting point.
  openNeeds: OpenNeed[];
  // MKT-S1-07: legal prerequisites are dependencies, never levers — the
  // Cadrage's legal-looking needs, and the Juridique's open actions (read
  // with manage_legal only: empty for anyone else).
  legalNeeds: OpenNeed[];
  legalDependencies: LegalDependency[];
  deliverables: StrategyDeliverable[];
  milestones: Milestone[];
  referenceDate: string | null;
  reports: ImportableReport[];
  members: Member[];
  validators: Member[];
  // A collective (lot 10): its titles and the titles each deliverable
  // targets (none listed: the whole project); null for any other project.
  titleScopes: {
    titles: ScopeTitle[];
    deliverables: Record<string, ActionTitleScope>;
  } | null;
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
    approvedBrief,
    workspaceRes,
    reportCountRes,
    objectivesRes,
    audiencesRes,
    legalRes,
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
    supabase
      .from("framing_briefs")
      .select("content")
      .eq("project_id", projectId)
      .eq("state", "approved")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("strategy_workspaces")
      .select("project_id")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("call_reports")
      .select("id, calls!inner(project_id)", { count: "exact", head: true })
      .eq("calls.project_id", projectId),
    supabase
      .from("strategy_objectives")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("strategy_audiences")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("legal_plan_items")
      .select(
        "id, label, status, due_on, responsible:people!legal_plan_items_responsible_person_id_fkey(first_name, last_name)",
      )
      .eq("project_id", projectId)
      .not("status", "in", "(done,obsolete)")
      .order("due_on", { nullsFirst: false }),
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
  const scopes = await loadTitleScopes(projectId);

  return {
    titleScopes: scopes
      ? {
          titles: scopes.titles,
          deliverables: Object.fromEntries(scopes.deliverables),
        }
      : null,
    stage,
    // A submitted or validated strategy has obviously begun.
    started:
      workspaceRes.data !== null ||
      stage?.state === "awaiting_validation" ||
      stage?.state === "validated",
    callReportCount: reportCountRes.count ?? 0,
    briefValidated,
    pendingValidation,
    fields: STRATEGY_TEXT_FIELDS.map((key) => {
      const row = rowOf("strategy", key);
      return answerWithChoices(
        toFieldState("strategy", key, row, row ? provenanceOf(row) : null),
        toChoiceValue(key, rowOf("strategy", choicesKey(key))?.value),
      );
    }),
    narrativeParts: NARRATIVE_PARTS.map((key) => {
      const row = rowOf("strategy", key);
      return toFieldState("strategy", key, row, row ? provenanceOf(row) : null);
    }),
    narrativeSummary: (() => {
      const row = rowOf("strategy", NARRATIVE_SUMMARY);
      return toFieldState(
        "strategy",
        NARRATIVE_SUMMARY,
        row,
        row ? provenanceOf(row) : null,
      );
    })(),
    positioningParts: POSITIONING_PARTS.map((key) => {
      const row = rowOf("strategy", key);
      return toFieldState("strategy", key, row, row ? provenanceOf(row) : null);
    }),
    audiences: audiencesRes.data ?? [],
    framingObjective: (() => {
      const confirmed = (key: "objective" | "success_criteria") => {
        const row = rowOf("brief", key);
        return row?.status === "confirmed" ? answerOf(key, row.value) : null;
      };
      const objective = confirmed("objective");
      const criteria = confirmed("success_criteria");
      return {
        text:
          objective?.kind === "text" && objective.text ? objective.text : null,
        measures:
          criteria?.kind === "text"
            ? (criteria.measures ?? []).map((m) => ({
                metric: m.metric,
                target: m.target,
                period: m.period,
              }))
            : [],
      };
    })(),
    strategicObjective: (() => {
      const row = rowOf("strategy", STRATEGIC_OBJECTIVE);
      return toFieldState(
        "strategy",
        STRATEGIC_OBJECTIVE,
        row,
        row ? provenanceOf(row) : null,
      );
    })(),
    objectives: objectivesRes.data ?? [],
    // MKT-S1-02: the Cadrage's envelope is an estimate, « à définir plus
    // tard » or a proposal nobody confirmed yet.
    envelopeToConfirm: (() => {
      const row = rowOf("brief", "budget_envelope");
      if (!row || row.status === "rejected") return false;
      if (row.status === "proposed") return true;
      const answer = answerOf("budget_envelope", row.value);
      return (
        answer?.kind === "later" ||
        (answer?.kind === "money" && answer.certainty === "estimated")
      );
    })(),
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
    brief: briefReminder(
      snapshotOf(approvedBrief.data?.content),
      BRIEF_TEXT_FIELDS.flatMap((key) => {
        const row = rowOf("brief", key);
        const field = toBriefField(key, row, null);
        return row?.status === "confirmed" && field.value
          ? [{ key, label: fr.framing.fields[key], value: field.value }]
          : [];
      }),
    ),
    levers: levers.map((l) => ({
      ...l,
      provenance: provenanceOf(l),
      needLabel: l.need_id ? (needLabel.get(l.need_id) ?? null) : null,
    })),
    openNeeds: needs.filter(
      (n) => !answered.has(n.id) && !isLegalItem(n.label),
    ),
    legalNeeds: needs.filter(
      (n) => !answered.has(n.id) && isLegalItem(n.label),
    ),
    legalDependencies: (legalRes.data ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      dueOn: item.due_on,
      responsibleName: item.responsible
        ? personName(item.responsible.first_name, item.responsible.last_name)
        : null,
    })),
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

export type BriefReminderLine = { key: string; label: string; value: string };

/** The validated Brief's objective and timing, line by line; before any
 * validated version, only what the Cadrage confirmed. */
function briefReminder(
  snapshot: BriefSnapshot | null,
  confirmed: BriefReminderLine[],
): BriefReminderLine[] {
  if (!snapshot) return confirmed;
  return snapshot.dimensions
    .filter((d) => d.dimension === "objective" || d.dimension === "timing")
    .flatMap((d) =>
      d.items.flatMap((item) => {
        const value =
          item.value ?? (item.lines.length ? item.lines.join("\n") : null);
        return value ? [{ key: item.key, label: item.label, value }] : [];
      }),
    );
}
