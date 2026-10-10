import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Access } from "@/lib/auth/access";
import { isStrategyTextField } from "@/lib/framing/brief";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { proposeStrategyChoices } from "@/lib/strategy/actions/choices";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * Turns the strategy items of a call report into proposals ("proposé · à
 * confirmer"), each keeping its provenance: positioning, audiences, narrative
 * and levers heard during the call. A proposal never overwrites a confirmed
 * value, a proposed lever is "to decide", and a report is imported at most
 * once. Milestones are never proposed: the calendar is entered by a person.
 * Runs with the user's client: RLS decides (strategy_is_editable).
 */
export async function importReportIntoStrategy(
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
  // RLS refuses once the strategy is submitted or validated.
  if (error?.code === "42501") return fail("stage_locked");
  return error ? fromDatabaseError(error) : ok;
}

/**
 * Right after the report of a strategy call is saved (« Préparer un
 * échange » of the Stratégie), its content lands in the Stratégie: nobody
 * imports by hand. The work counts as started (the entry gives way), the
 * report's items become proposals, then PO pre-checks the closed answers the
 * sources support — one passage of the call can feed several dimensions.
 * Only the first report of a call is imported. Returns whether anything was
 * done, so the processing can open the Stratégie.
 */
export async function fillStrategyFromCall(
  supabase: Client,
  access: Access,
  callId: string,
): Promise<boolean> {
  const { data: call } = await supabase
    .from("strategy_calls")
    .select("project_id")
    .eq("call_id", callId)
    .maybeSingle();
  if (!call || !access.organizationId) return false;
  const projectId = call.project_id;

  const { data: reports } = await supabase
    .from("call_reports")
    .select("id")
    .eq("call_id", callId)
    .order("created_at", { ascending: false });
  if (reports?.length !== 1) return false;

  // Starting twice is harmless; refused when the plan has not started the
  // stage or the strategy is already submitted: then nothing is written.
  const { error: startError } = await supabase.rpc("start_strategy", {
    p_project_id: projectId,
  });
  if (startError) {
    console.error("[strategy] auto start failed:", startError.message);
    return false;
  }

  const imported = await importReportIntoStrategy(
    supabase,
    access.organizationId,
    projectId,
    reports[0].id,
  );
  if (!imported.ok && imported.error !== "nothing_to_import")
    console.error("[strategy] auto import failed:", imported.error);

  // A provider failure leaves the import in place: « Proposer des réponses »
  // stays on the page to try again.
  const proposed = await proposeStrategyChoices(projectId);
  if (!proposed.ok) console.error("[strategy] auto choices:", proposed.error);
  return true;
}
