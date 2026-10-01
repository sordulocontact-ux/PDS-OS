import "server-only";

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { daysAgo } from "@/lib/insights/dates";
import { createClient } from "@/lib/supabase/server";

export type ActivityKind =
  | "call_created"
  | "report_created"
  | "brief_proposed"
  | "brief_confirmed"
  | "brief_rejected"
  | "task_created"
  | "task_done"
  | "point_resolved"
  | "stage_changed"
  | "validation_requested"
  | "validation_decided"
  | "release_online"
  | "file_added";

// Human labels for Brief fields, so neither the UI nor the model sees raw keys.
const BRIEF_FIELD_LABELS: Record<string, string> = {
  objective: "Objectif",
  timing: "Temporalité",
  frame: "Cadre",
};

export type ActivityEvent = {
  at: string;
  kind: ActivityKind;
  projectId: string;
  projectTitle: string;
  detail: string;
  href: string;
};

/**
 * Dated events rebuilt from the timestamps already stored in the database.
 * No separate audit log: each table's own dates are the history.
 */
export async function loadRecentActivity(options: {
  projectId?: string;
  days: number;
  limit?: number;
}): Promise<ActivityEvent[]> {
  const supabase = await createClient();
  const since = daysAgo(options.days);
  const byProject = <Q extends { eq: (col: string, v: string) => Q }>(q: Q) =>
    options.projectId ? q.eq("project_id", options.projectId) : q;
  // Same filter through an embedded table (reports of calls, validations of
  // stages), so a project's history does not read the whole organization.
  const byEmbedded = <Q extends { eq: (col: string, v: string) => Q }>(
    column: string,
    q: Q,
  ) => (options.projectId ? q.eq(column, options.projectId) : q);

  const [
    projects,
    calls,
    reports,
    fields,
    tasksCreated,
    tasksDone,
    points,
    stages,
    validations,
    releases,
    files,
  ] = await Promise.all([
    supabase.from("projects").select("id, title"),
    byProject(
      supabase
        .from("calls")
        .select("project_id, title, created_at, id")
        .gte("created_at", since),
    ),
    byEmbedded(
      "calls.project_id",
      supabase
        .from("call_reports")
        .select("created_at, calls!inner(id, title, project_id)")
        .gte("created_at", since),
    ),
    byProject(
      supabase
        .from("field_values")
        .select("project_id, field_key, status, created_at")
        .gte("created_at", since),
    ),
    byProject(
      supabase
        .from("tasks")
        .select("project_id, title, created_at")
        .gte("created_at", since),
    ),
    byProject(
      supabase
        .from("tasks")
        .select("project_id, title, done_at")
        .gte("done_at", since),
    ),
    byProject(
      supabase
        .from("open_points")
        .select("project_id, question, resolved_at")
        .gte("resolved_at", since),
    ),
    byProject(
      supabase
        .from("project_stages")
        .select(
          "project_id, state, state_changed_at, stage_definitions!inner(label)",
        )
        .gte("state_changed_at", since),
    ),
    byEmbedded(
      "project_stages.project_id",
      supabase
        .from("validations")
        .select(
          "state, requested_at, decided_at, project_stages!inner(project_id, stage_definitions!inner(label))",
        )
        .or(`requested_at.gte.${since},decided_at.gte.${since}`),
    ),
    byProject(
      supabase
        .from("releases")
        .select("project_id, title, online_detected_at")
        .gte("online_detected_at", since),
    ),
    // Documents of the project library (RLS hides contracts from whoever
    // may not read them).
    byProject(
      supabase
        .from("project_files")
        .select("project_id, file_name, created_at")
        .gte("created_at", since),
    ),
  ]);

  const titles = new Map((projects.data ?? []).map((p) => [p.id, p.title]));
  const events: ActivityEvent[] = [];
  const push = (
    at: string | null,
    kind: ActivityKind,
    projectId: string,
    detail: string,
    href = routes.project(projectId),
  ) => {
    if (!at || at < since) return;
    if (options.projectId && projectId !== options.projectId) return;
    events.push({
      at,
      kind,
      projectId,
      projectTitle: titles.get(projectId) ?? "—",
      detail,
      href,
    });
  };

  // Project activity: internal meetings (no project) are not part of it.
  for (const c of calls.data ?? [])
    if (c.project_id)
      push(
        c.created_at,
        "call_created",
        c.project_id,
        c.title,
        routes.projectCall(c.project_id, c.id),
      );
  for (const r of reports.data ?? [])
    if (r.calls.project_id)
      push(
        r.created_at,
        "report_created",
        r.calls.project_id,
        r.calls.title,
        routes.projectCall(r.calls.project_id, r.calls.id),
      );
  const fieldKind = {
    proposed: "brief_proposed",
    confirmed: "brief_confirmed",
    rejected: "brief_rejected",
  } as const;
  for (const f of fields.data ?? []) {
    const kind = fieldKind[f.status as keyof typeof fieldKind];
    if (kind)
      push(
        f.created_at,
        kind,
        f.project_id,
        BRIEF_FIELD_LABELS[f.field_key] ?? f.field_key,
        routes.projectFraming(f.project_id),
      );
  }
  for (const t of tasksCreated.data ?? [])
    push(
      t.created_at,
      "task_created",
      t.project_id,
      t.title,
      routes.projectFraming(t.project_id),
    );
  for (const t of tasksDone.data ?? [])
    push(
      t.done_at,
      "task_done",
      t.project_id,
      t.title,
      routes.projectFraming(t.project_id),
    );
  for (const p of points.data ?? [])
    push(
      p.resolved_at,
      "point_resolved",
      p.project_id,
      p.question,
      routes.projectFraming(p.project_id),
    );
  for (const s of stages.data ?? [])
    push(
      s.state_changed_at,
      "stage_changed",
      s.project_id,
      `${s.stage_definitions.label} : ${fr.shell.stageStates[s.state as keyof typeof fr.shell.stageStates] ?? s.state}`,
    );
  for (const v of validations.data ?? []) {
    const projectId = v.project_stages.project_id;
    const label = v.project_stages.stage_definitions.label;
    push(
      v.requested_at,
      "validation_requested",
      projectId,
      label,
      routes.projectFraming(projectId),
    );
    push(
      v.decided_at,
      "validation_decided",
      projectId,
      `${label} : ${fr.assistant.validationStates[v.state] ?? v.state}`,
      routes.projectFraming(projectId),
    );
  }
  for (const r of releases.data ?? [])
    push(
      r.online_detected_at,
      "release_online",
      r.project_id,
      r.title,
      routes.projectRelease(r.project_id),
    );
  for (const f of files.data ?? [])
    push(
      f.created_at,
      "file_added",
      f.project_id,
      f.file_name,
      routes.projectFiles(f.project_id),
    );

  return events
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, options.limit ?? 40);
}
