"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { isBriefTextField } from "@/lib/framing/brief";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { createClient } from "@/lib/supabase/server";

const input = z.object({ projectId: z.uuid(), reportId: z.uuid() });

/**
 * Turns a call report into Brief proposals ("proposé · à confirmer"), each
 * keeping its provenance. A proposal never overwrites a confirmed value, and a
 * report is imported at most once. Next actions are not turned into tasks here:
 * a task needs an owner and a due date, chosen by a person.
 */
export async function importReport(
  projectId: string,
  reportId: string,
): Promise<ActionResult> {
  const parsed = input.safeParse({ projectId, reportId });
  if (!parsed.success) return fail("invalid_input");
  const access = await requireApproved();
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("call_reports")
    .select("id, call_id, calls!inner(project_id)")
    .eq("id", reportId)
    .eq("calls.project_id", projectId)
    .maybeSingle();
  if (!report || !access.organizationId) return fail("not_found");
  const organizationId = access.organizationId;

  const { data: items } = await supabase
    .from("report_items")
    .select("*")
    .eq("report_id", reportId)
    .order("position");
  if (!items?.length) return fail("not_found");
  const itemIds = items.map((i) => i.id);

  const [f, n, t, o] = await Promise.all([
    supabase
      .from("field_values")
      .select("id")
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
  ]);
  if ([f, n, t, o].some((r) => (r.data?.length ?? 0) > 0))
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
    team.length ? supabase.from("project_team_members").insert(team) : null,
    points.length ? supabase.from("open_points").insert(points) : null,
  ]);
  const error = results.find((r) => r?.error)?.error;
  if (error) return fromDatabaseError(error);

  revalidatePath(routes.projectFraming(projectId));
  return ok;
}
