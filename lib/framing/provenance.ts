import "server-only";

import type { Provenance } from "@/lib/framing/brief";
import { createClient } from "@/lib/supabase/server";

type CallProvenance = Extract<Provenance, { kind: "call" }>;

type Sourced = {
  source_report_item_id: string | null;
  source_quote: string | null;
  source_start_seconds: number | null;
};

/**
 * Resolves the call each sourced row comes from (item → report → call), in
 * three small queries, so every value can link back to its origin.
 */
export async function resolveProvenance(
  rows: Sourced[],
): Promise<Map<string, Provenance>> {
  const itemIds = [
    ...new Set(
      rows.flatMap((r) =>
        r.source_report_item_id ? [r.source_report_item_id] : [],
      ),
    ),
  ];
  const result = new Map<string, Provenance>();
  if (itemIds.length === 0) return result;

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("report_items")
    .select("id, report_id, located")
    .in("id", itemIds);
  const reportIds = [...new Set((items ?? []).map((i) => i.report_id))];
  const { data: reports } = await supabase
    .from("call_reports")
    .select("id, call_id")
    .in("id", reportIds);
  const callIds = [...new Set((reports ?? []).map((r) => r.call_id))];
  const { data: calls } = await supabase
    .from("calls")
    .select("id, title")
    .in("id", callIds);

  const callOfReport = new Map((reports ?? []).map((r) => [r.id, r.call_id]));
  const titleOfCall = new Map((calls ?? []).map((c) => [c.id, c.title]));

  for (const row of rows) {
    if (!row.source_report_item_id) continue;
    const item = items?.find((i) => i.id === row.source_report_item_id);
    const callId = item ? (callOfReport.get(item.report_id) ?? null) : null;
    result.set(row.source_report_item_id, {
      kind: "call",
      quote: row.source_quote ?? "",
      located: item ? (item.located as CallProvenance["located"]) : null,
      startSeconds: row.source_start_seconds,
      callId,
      callTitle: callId ? (titleOfCall.get(callId) ?? null) : null,
    });
  }
  return result;
}
