import "server-only";

import type { Access } from "@/lib/auth/access";
import {
  BRIEF_TEXT_FIELDS,
  toBriefField,
  type BriefFieldState,
  type Provenance,
} from "@/lib/framing/brief";
import { provenanceLookup } from "@/lib/framing/provenance";
import type { ObjectiveSuggestion } from "@/lib/framing/suggest-objective";
import {
  loadImportableReports,
  loadMembers,
  loadPendingValidation,
  loadValidators,
  type ImportableReport,
  type Member,
  type PendingValidation,
} from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Need = Tables["needs"]["Row"];
type TeamMember = Tables["project_team_members"]["Row"];
type OpenPoint = Tables["open_points"]["Row"];
type Task = Tables["tasks"]["Row"];
type Constraint = Tables["framing_constraints"]["Row"];
type ReportItem = Tables["report_items"]["Row"];
type FieldRow = Database["public"]["Views"]["current_field_values"]["Row"];

/** Framing opens with a call report or "Commencer en amont"; the rule lives in SQL (framing_is_open). */
export async function isFramingOpen(projectId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("framing_is_open", {
    p_project_id: projectId,
  });
  if (error) console.error("isFramingOpen:", error.message);
  return data === true;
}

export type FramingData = {
  project: { id: string; title: string; organizationId: string };
  stage: { id: string; state: string } | null;
  pendingValidation: PendingValidation | null;
  fields: BriefFieldState[];
  // Every current Brief row (questions of the Cadrage intelligent, « rien à
  // signaler » markers, suggestions), with where it comes from.
  briefRows: Array<
    FieldRow & {
      provenance: Provenance | null;
      // Who wrote the current row, said for a confirmed value (PROJ-BUG-02).
      authorName: string | null;
    }
  >;
  needs: Array<Need & { provenance: Provenance | null }>;
  team: Array<TeamMember & { provenance: Provenance | null }>;
  constraints: Array<Constraint & { provenance: Provenance | null }>;
  // Objective rephrasings PO suggested (lib/framing/actions/objective.ts).
  objectiveSuggestions: ObjectiveSuggestion[];
  openPoints: Array<OpenPoint & { provenance: Provenance | null }>;
  tasks: Task[];
  proposedActions: ReportItem[];
  reports: ImportableReport[];
  members: Member[];
  // Who a validation may be asked of: holders of "validate" (the director).
  validators: Member[];
};

function suggestionsOf(
  rows: Array<{ field_key: string | null; value: unknown }>,
): ObjectiveSuggestion[] {
  const row = rows.find((r) => r.field_key === "objective_suggestions");
  const items = (row?.value as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as ObjectiveSuggestion[]) : [];
}

/** Everything the framing page shows, read with the user's session (RLS). */
export async function loadFraming(
  projectId: string,
  access: Access,
): Promise<FramingData | null> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const [
    stageRes,
    fieldsRes,
    needsRes,
    teamRes,
    constraintsRes,
    pointsRes,
    tasksRes,
    members,
    reports,
    validators,
  ] = await Promise.all([
    supabase
      .from("project_stages")
      .select("id, state, stage_definitions!inner(key)")
      .eq("project_id", projectId)
      .eq("stage_definitions.key", "framing")
      .maybeSingle(),
    supabase
      .from("current_field_values")
      .select("*")
      .eq("project_id", projectId)
      .eq("deliverable", "brief"),
    supabase
      .from("needs")
      .select("*")
      .eq("project_id", projectId)
      .neq("review_status", "rejected")
      .order("created_at"),
    supabase
      .from("project_team_members")
      .select("*")
      .eq("project_id", projectId)
      .neq("review_status", "rejected")
      .order("created_at"),
    supabase
      .from("framing_constraints")
      .select("*")
      .eq("project_id", projectId)
      .neq("review_status", "rejected")
      .order("created_at"),
    supabase
      .from("open_points")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("due_date"),
    loadMembers(access),
    loadImportableReports(projectId),
    loadValidators(project.organization_id),
  ]);

  const stage = stageRes.data
    ? { id: stageRes.data.id, state: stageRes.data.state }
    : null;
  const fieldRows = fieldsRes.data ?? [];
  const needs = needsRes.data ?? [];
  const team = teamRes.data ?? [];
  const constraints = constraintsRes.data ?? [];
  const openPoints = pointsRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  // Next actions of imported reports that have not become tasks yet.
  const importedIds = reports.filter((r) => r.imported).map((r) => r.reportId);
  // Three independent reads, in one round trip instead of three in a row
  // (page loads audit, docs/ARCHITECTURE.md § 3 bis).
  const [provenanceOf, pendingValidation, { data: actionItems }] =
    await Promise.all([
      provenanceLookup(
        [
          ...fieldRows,
          ...needs,
          ...team,
          ...constraints,
          ...openPoints.map((p) => ({
            source_report_item_id: p.source_report_item_id,
          })),
        ],
        members,
      ),
      loadPendingValidation(stage?.id ?? null, members),
      importedIds.length
        ? supabase
            .from("report_items")
            .select("*")
            .in("report_id", importedIds)
            .eq("kind", "next_action")
            .order("position")
        : { data: [] as ReportItem[] },
    ]);
  const converted = new Set(tasks.map((t) => t.source_report_item_id));

  return {
    project: {
      id: project.id,
      title: project.title,
      organizationId: project.organization_id,
    },
    stage,
    pendingValidation,
    objectiveSuggestions: suggestionsOf(fieldRows),
    briefRows: fieldRows.map((row) => ({
      ...row,
      provenance: provenanceOf(row),
      authorName:
        members.find((m) => m.personId === row.created_by)?.name ?? null,
    })),
    fields: BRIEF_TEXT_FIELDS.map((key) => {
      const row = fieldRows.find((r) => r.field_key === key);
      return toBriefField(
        key,
        row ?? undefined,
        row ? provenanceOf(row) : null,
      );
    }),
    needs: needs.map((n) => ({
      ...n,
      provenance: provenanceOf(n),
    })),
    team: team.map((m) => ({
      ...m,
      provenance: provenanceOf(m),
    })),
    constraints: constraints.map((c) => ({
      ...c,
      provenance: provenanceOf(c),
    })),
    openPoints: openPoints.map((p) => ({
      ...p,
      provenance: provenanceOf(p),
    })),
    tasks,
    proposedActions: (actionItems ?? []).filter(
      (item) => !converted.has(item.id),
    ),
    reports,
    members,
    validators,
  };
}
