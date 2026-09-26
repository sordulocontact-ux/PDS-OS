import "server-only";

import type { Access } from "@/lib/auth/access";
import {
  BRIEF_TEXT_FIELDS,
  toBriefField,
  type BriefFieldState,
  type Provenance,
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
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Need = Tables["needs"]["Row"];
type TeamMember = Tables["project_team_members"]["Row"];
type OpenPoint = Tables["open_points"]["Row"];
type Task = Tables["tasks"]["Row"];
type ReportItem = Tables["report_items"]["Row"];

/** No framing without a call report; the rule lives in SQL (framing_is_open). */
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
  needs: Array<Need & { provenance: Provenance | null }>;
  team: Array<TeamMember & { provenance: Provenance | null }>;
  openPoints: Array<OpenPoint & { provenance: Provenance | null }>;
  tasks: Task[];
  proposedActions: ReportItem[];
  reports: ImportableReport[];
  members: Member[];
  // Who a validation may be asked of: holders of "validate" (the director).
  validators: Member[];
};

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
  const openPoints = pointsRes.data ?? [];
  const tasks = tasksRes.data ?? [];

  const provenanceOf = await provenanceLookup(
    [
      ...fieldRows,
      ...needs,
      ...team,
      ...openPoints.map((p) => ({
        source_report_item_id: p.source_report_item_id,
      })),
    ],
    members,
  );
  const pendingValidation = await loadPendingValidation(
    stage?.id ?? null,
    members,
  );

  // Next actions of imported reports that have not become tasks yet.
  const importedIds = reports.filter((r) => r.imported).map((r) => r.reportId);
  const { data: actionItems } = importedIds.length
    ? await supabase
        .from("report_items")
        .select("*")
        .in("report_id", importedIds)
        .eq("kind", "next_action")
        .order("position")
    : { data: [] as ReportItem[] };
  const converted = new Set(tasks.map((t) => t.source_report_item_id));

  return {
    project: {
      id: project.id,
      title: project.title,
      organizationId: project.organization_id,
    },
    stage,
    pendingValidation,
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
