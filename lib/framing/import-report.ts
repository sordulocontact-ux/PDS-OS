import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { linkTeamToMembers } from "@/lib/framing/team-link";
import { isBriefTextField } from "@/lib/framing/brief";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

// Framing states that still take proposals (not submitted, not validated).
const OPEN_STATES = ["not_started", "in_progress"];

/**
 * Right after a call report is saved, its content is proposed in the Brief:
 * nobody imports by hand. Only the first report of a call is imported (a
 * re-extraction would duplicate the proposals), and only while the framing is
 * still being written. Runs with the user's client: RLS decides.
 *
 * This is also the one moment the stage is allowed to leave "not_started" on
 * its own, with no button to click: a report cannot exist before the call is
 * open, so starting the stage here can never race ahead of framing_is_open.
 */
export async function fillBriefFromCall(
  supabase: Client,
  callId: string,
): Promise<boolean> {
  const { data: call } = await supabase
    .from("calls")
    .select("project_id, organization_id")
    .eq("id", callId)
    .maybeSingle();
  // An internal meeting has no project, so no Brief to fill.
  if (!call?.project_id) return false;
  const projectId = call.project_id;

  const [reports, stage] = await Promise.all([
    supabase
      .from("call_reports")
      .select("id")
      .eq("call_id", callId)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_stages")
      .select("id, state, stage_definitions!inner(key)")
      .eq("project_id", projectId)
      .eq("stage_definitions.key", "framing")
      .maybeSingle(),
  ]);
  const report = reports.data?.length === 1 ? reports.data[0] : null;
  if (!report || !stage.data || !OPEN_STATES.includes(stage.data.state)) {
    return false;
  }

  if (stage.data.state === "not_started") {
    const { error } = await supabase.rpc("start_stage", {
      p_stage_id: stage.data.id,
    });
    if (error) console.error("[framing] auto start failed:", error.message);
  }

  const result = await importReportIntoBrief(
    supabase,
    call.organization_id,
    projectId,
    report.id,
  );
  if (!result.ok) console.error("[framing] auto import failed:", result.error);
  return result.ok;
}

/**
 * Turns a call report into Brief proposals ("proposé · à confirmer"), each
 * keeping its provenance. A proposal never overwrites a confirmed value, and a
 * report is imported at most once. Next actions are not turned into tasks here:
 * a task needs an owner and a due date, chosen by a person.
 */
export async function importReportIntoBrief(
  supabase: Client,
  organizationId: string,
  projectId: string,
  reportId: string,
): Promise<ActionResult> {
  const { data: items } = await supabase
    .from("report_items")
    .select("*")
    .eq("report_id", reportId)
    .order("position");
  if (!items?.length) return fail("not_found");
  const itemIds = items.map((i) => i.id);

  const [f, n, t, o, c] = await Promise.all([
    supabase
      .from("field_values")
      .select("id")
      .eq("deliverable", "brief")
      .in("source_report_item_id", itemIds)
      .limit(1),
    supabase
      .from("needs")
      .select("id")
      .in("source_report_item_id", itemIds)
      .limit(1),
    supabase
      .from("project_team_members")
      .select("id")
      .in("source_report_item_id", itemIds)
      .limit(1),
    supabase
      .from("open_points")
      .select("id")
      .in("source_report_item_id", itemIds)
      .limit(1),
    supabase
      .from("framing_constraints")
      .select("id")
      .in("source_report_item_id", itemIds)
      .limit(1),
  ]);
  if ([f, n, t, o, c].some((r) => (r.data?.length ?? 0) > 0))
    return fail("already_imported");

  const { data: current } = await supabase
    .from("current_field_values")
    .select("field_key, status")
    .eq("project_id", projectId)
    .eq("deliverable", "brief");
  const confirmed = new Set(
    (current ?? [])
      .filter((c) => c.status === "confirmed")
      .map((c) => c.field_key),
  );

  const source = (item: (typeof items)[number]) => ({
    organization_id: organizationId,
    project_id: projectId,
    source_type: "call",
    source_report_item_id: item.id,
    source_quote: item.quote,
    source_start_seconds: item.start_seconds,
  });

  const fields = items
    .filter((i) => isBriefTextField(i.kind) && !confirmed.has(i.kind))
    .map((i) => ({
      ...source(i),
      deliverable: "brief",
      field_key: i.kind,
      value: i.what,
      status: "proposed",
    }));
  const needs = items
    .filter((i) => i.kind === "need" && i.need_family)
    .map((i) => ({
      ...source(i),
      label: i.what,
      family: i.need_family as string,
      review_status: "proposed",
    }));
  const team = items
    .filter((i) => i.kind === "team")
    .map((i) => ({
      ...source(i),
      display_name: i.what,
      role: i.who,
      review_status: "proposed",
    }));
  // The report does not type a constraint: it arrives as "other" and the
  // person picks budget, production… while reviewing it.
  const constraints = items
    .filter((i) => i.kind === "frame")
    .map((i) => ({
      ...source(i),
      type: "other",
      text: i.what,
      review_status: "proposed",
    }));
  const points = items
    .filter((i) => i.kind === "open")
    .map((i) => ({
      organization_id: organizationId,
      project_id: projectId,
      question: i.what,
      source_report_item_id: i.id,
    }));

  const results = await Promise.all([
    fields.length ? supabase.from("field_values").insert(fields) : null,
    needs.length ? supabase.from("needs").insert(needs) : null,
    team.length
      ? supabase
          .from("project_team_members")
          .insert(await linkTeamToMembers(supabase, team))
      : null,
    constraints.length
      ? supabase.from("framing_constraints").insert(constraints)
      : null,
    points.length ? supabase.from("open_points").insert(points) : null,
  ]);
  const error = results.find((r) => r?.error)?.error;
  if (error) return fromDatabaseError(error);

  return ok;
}
