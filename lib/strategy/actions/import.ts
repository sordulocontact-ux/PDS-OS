"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { isStrategyTextField } from "@/lib/framing/brief";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { createClient } from "@/lib/supabase/server";

const input = z.object({ projectId: z.uuid(), reportId: z.uuid() });

/**
 * Turns the strategy items of a call report into proposals ("proposé · à
 * confirmer"), each keeping its provenance: positioning, audiences, narrative
 * and levers heard during the call. A proposal never overwrites a confirmed
 * value, a proposed lever is "to decide", and a report is imported at most
 * once. Milestones are never proposed: the calendar is entered by a person.
 */
export async function importStrategyReport(
  projectId: string,
  reportId: string,
): Promise<ActionResult> {
  const parsed = input.safeParse({ projectId, reportId });
  if (!parsed.success) return fail("invalid_input");
  const access = await requireApproved();
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("call_reports")
    .select("id, calls!inner(project_id)")
    .eq("id", reportId)
    .eq("calls.project_id", projectId)
    .maybeSingle();
  if (!report || !access.organizationId) return fail("not_found");
  const organizationId = access.organizationId;

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
  return done(projectId, results.find((r) => r?.error)?.error ?? null);
}
