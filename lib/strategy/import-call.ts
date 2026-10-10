import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isStrategyTextField } from "@/lib/framing/brief";
import { fail, ok, type ActionResult } from "@/lib/framing/result";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * The strategy items of a call report become proposals (« proposé · à
 * confirmer »), each keeping its provenance: positioning, audiences,
 * narrative and levers heard during the call. One answer may feed several
 * dimensions. A proposal never overwrites a confirmed value, a proposed
 * lever is « à arbitrer », a report is imported at most once. Milestones,
 * budget and KPIs are never proposed: a person enters them.
 */
export async function importStrategyItems(
  supabase: Client,
  organizationId: string,
  projectId: string,
  reportId: string,
): Promise<ActionResult> {
  const { data: all } = await supabase
    .from("report_items")
    .select("*")
    .eq("report_id", reportId)
    .order("position");
  const items = (all ?? []).filter(
    (i) => isStrategyTextField(i.kind) || i.kind === "lever",
  );
  if (items.length === 0) return fail("nothing_to_import");
  const itemIds = items.map((i) => i.id);

  const [f, l] = await Promise.all([
    supabase
      .from("field_values")
      .select("id")
      .in("source_report_item_id", itemIds)
      .limit(1),
    supabase
      .from("levers")
      .select("id")
      .in("source_report_item_id", itemIds)
      .limit(1),
  ]);
  if ([f, l].some((r) => (r.data?.length ?? 0) > 0))
    return fail("already_imported");

  const { data: current } = await supabase
    .from("current_field_values")
    .select("field_key, status")
    .eq("project_id", projectId)
    .eq("deliverable", "strategy");
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
    .filter((i) => isStrategyTextField(i.kind) && !confirmed.has(i.kind))
    .map((i) => ({
      ...source(i),
      deliverable: "strategy",
      field_key: i.kind,
      value: i.what,
      status: "proposed",
    }));
  const levers = items
    .filter((i) => i.kind === "lever" && i.need_family)
    .map((i) => ({
      ...source(i),
      label: i.what,
      family: i.need_family as string,
      review_status: "proposed",
    }));

  const results = await Promise.all([
    fields.length ? supabase.from("field_values").insert(fields) : null,
    levers.length ? supabase.from("levers").insert(levers) : null,
  ]);
  const error = results.find((r) => r?.error)?.error;
  if (error) {
    console.error("importStrategyItems:", error.code, error.message);
    return fail(error.code === "42501" ? "stage_locked" : "generic");
  }
  return ok;
}

/**
 * Right after the report of a strategy exchange is saved, its content is
 * proposed in the Strategy: nobody imports by hand. Only the first report of
 * the call, only while the strategy is editable (RLS decides).
 */
export async function fillStrategyFromCall(
  supabase: Client,
  callId: string,
): Promise<boolean> {
  const { data: call } = await supabase
    .from("strategy_calls")
    .select("project_id, organization_id")
    .eq("call_id", callId)
    .maybeSingle();
  if (!call) return false;
  const { data: reports } = await supabase
    .from("call_reports")
    .select("id")
    .eq("call_id", callId);
  if (reports?.length !== 1) return false;
  const result = await importStrategyItems(
    supabase,
    call.organization_id,
    call.project_id,
    reports[0].id,
  );
  return result.ok;
}
