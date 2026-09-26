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

/** Latest report of each call of the project, and whether it was imported. */
export async function loadImportableReports(
  projectId: string,
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
  // A report counts as imported once one of its items is referenced by the Brief.
  const { data: used } = itemIds.length
    ? await supabase
        .from("field_values")
        .select("source_report_item_id")
        .in("source_report_item_id", itemIds)
    : { data: [] };
  const { data: usedPoints } = itemIds.length
    ? await supabase
        .from("open_points")
        .select("source_report_item_id")
        .in("source_report_item_id", itemIds)
    : { data: [] };
  const usedItems = new Set(
    [...(used ?? []), ...(usedPoints ?? [])].map(
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
