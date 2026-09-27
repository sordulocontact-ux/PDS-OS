import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export type Member = { personId: string; name: string };
export type ImportableReport = {
  reportId: string;
  callId: string;
  callTitle: string;
  createdAt: string;
  imported: boolean;
};

/** People who can be named validator or task owner: approved members. */
export async function loadMembers(access: Access): Promise<Member[]> {
  const supabase = await createClient();
  const { data: people } = await supabase
    .from("people")
    .select("id, first_name, last_name")
    .order("first_name");
  let rows = people ?? [];

  // RLS already limits a non-admin to approved members; an admin also sees
  // pending requests, which are filtered out here.
  if (can(access, "administer")) {
    const { data: approved } = await supabase
      .from("memberships")
      .select("person_id")
      .eq("status", "approved");
    const ids = new Set((approved ?? []).map((m) => m.person_id));
    rows = rows.filter((p) => ids.has(p.id));
  }
  return rows.map((p) => ({
    personId: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(" "),
  }));
}

/**
 * Latest report of each call of the project, and whether it was imported into
 * the given deliverable (Brief or Strategy).
 */
export async function loadImportableReports(
  projectId: string,
  deliverable: "brief" | "strategy" = "brief",
): Promise<ImportableReport[]> {
  const supabase = await createClient();
  const { data: calls } = await supabase
    .from("calls")
    .select("id, title")
    .eq("project_id", projectId);
  if (!calls?.length) return [];

  const { data: reports } = await supabase
    .from("call_reports")
    .select("id, call_id, created_at")
    .in(
      "call_id",
      calls.map((c) => c.id),
    )
    .order("created_at", { ascending: false });
  const latest = new Map<string, { id: string; created_at: string }>();
  for (const r of reports ?? [])
    if (!latest.has(r.call_id)) latest.set(r.call_id, r);
  if (latest.size === 0) return [];

  const reportIds = [...latest.values()].map((r) => r.id);
  const { data: items } = await supabase
    .from("report_items")
    .select("id, report_id")
    .in("report_id", reportIds);
  const itemIds = (items ?? []).map((i) => i.id);
  // A report counts as imported once one of its items is referenced by the
  // deliverable: its fields, plus open points (Brief) or levers (Strategy).
  const [used, usedOther] = itemIds.length
    ? await Promise.all([
        supabase
          .from("field_values")
          .select("source_report_item_id")
          .eq("deliverable", deliverable)
          .in("source_report_item_id", itemIds),
        supabase
          .from(deliverable === "brief" ? "open_points" : "levers")
          .select("source_report_item_id")
          .in("source_report_item_id", itemIds),
      ])
    : [{ data: [] }, { data: [] }];
  const usedItems = new Set(
    [...(used.data ?? []), ...(usedOther.data ?? [])].map(
      (u) => u.source_report_item_id,
    ),
  );
  const importedReports = new Set(
    (items ?? []).filter((i) => usedItems.has(i.id)).map((i) => i.report_id),
  );

  return calls.flatMap((call) => {
    const report = latest.get(call.id);
    return report
      ? [
          {
            reportId: report.id,
            callId: call.id,
            callTitle: call.title,
            createdAt: report.created_at,
            imported: importedReports.has(report.id),
          },
        ]
      : [];
  });
}

export type PendingValidation = {
  id: string;
  validatorPersonId: string;
  validatorName: string;
  note: string | null;
};

/**
 * Whether a stage already has a validation request awaiting a decision — all
 * the project header needs to decide whether "Demander la validation" still
 * applies, without loading the fuller FramingData just for that button.
 */
export async function hasPendingValidation(stageId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("validations")
    .select("id")
    .eq("project_stage_id", stageId)
    .eq("state", "pending")
    .maybeSingle();
  return data !== null;
}

/** The validation awaiting a decision on a stage, if any. */
export async function loadPendingValidation(
  stageId: string | null,
  members: Member[],
): Promise<PendingValidation | null> {
  if (!stageId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("validations")
    .select("id, validator_person_id, request_note")
    .eq("project_stage_id", stageId)
    .eq("state", "pending")
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    validatorPersonId: data.validator_person_id,
    validatorName:
      members.find((m) => m.personId === data.validator_person_id)?.name ?? "—",
    note: data.request_note,
  };
}

/** Who a validation may be asked of: holders of "validate" (the director). */
export async function loadValidators(
  organizationId: string,
): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_validators", {
    p_organization_id: organizationId,
  });
  return (data ?? []).map((v) => ({
    personId: v.person_id,
    name: [v.first_name, v.last_name].filter(Boolean).join(" "),
  }));
}
