import "server-only";

import type { Provenance } from "@/lib/framing/brief";
import type { Member } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

type CallProvenance = Extract<Provenance, { kind: "call" }>;

type Sourced = {
  source_report_item_id: string | null;
  source_quote: string | null;
  source_start_seconds: number | null;
};

/**
 * Resolves the call each sourced row comes from (item → report → call), in
 * one query (nested, left-joined embeds: each table still under its own RLS,
 * a hidden report or call reads as null exactly like the three separate
 * reads it replaces; page loads audit, docs/ARCHITECTURE.md § 3 bis), so
 * every value can link back to its origin.
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
    .select("id, located, report:call_reports(call_id, call:calls(title))")
    .in("id", itemIds);

  for (const row of rows) {
    if (!row.source_report_item_id) continue;
    const item = items?.find((i) => i.id === row.source_report_item_id);
    const callId = item?.report?.call_id ?? null;
    result.set(row.source_report_item_id, {
      kind: "call",
      quote: row.source_quote ?? "",
      located: item ? (item.located as CallProvenance["located"]) : null,
      startSeconds: row.source_start_seconds,
      callId,
      callTitle: callId ? (item?.report?.call?.title ?? null) : null,
    });
  }
  return result;
}

type ProvenanceRow = {
  source_report_item_id: string | null;
  source_type?: string | null;
  source_quote?: string | null;
  source_start_seconds?: number | null;
  source_label?: string | null;
  created_by?: string | null;
  confidence?: string | null;
};

/**
 * Resolves the provenance of every row at once, then returns a lookup: a call
 * (with its quote and moment), a dictation (with who dictated), or null.
 */
export async function provenanceLookup(
  rows: ProvenanceRow[],
  members: Member[],
): Promise<(row: ProvenanceRow) => Provenance | null> {
  const resolved = await resolveProvenance(
    rows.map((r) => ({
      source_report_item_id: r.source_report_item_id,
      source_quote: r.source_quote ?? null,
      source_start_seconds: r.source_start_seconds ?? null,
    })),
  );
  const nameOf = new Map(members.map((m) => [m.personId, m.name]));
  return (row) => {
    if (row.source_type === "voice")
      return {
        kind: "voice",
        quote: row.source_quote ?? "",
        author: row.created_by ? (nameOf.get(row.created_by) ?? null) : null,
      };
    if (row.source_type === "generated")
      return {
        kind: "generated",
        label: row.source_label ?? "",
        quote: row.source_quote ?? null,
        confidence:
          row.confidence === "high" ||
          row.confidence === "medium" ||
          row.confidence === "low"
            ? row.confidence
            : null,
      };
    if (row.source_label)
      return {
        kind: "record",
        label: row.source_label,
        quote: row.source_quote ?? null,
      };
    const itemId = row.source_report_item_id;
    return itemId ? (resolved.get(itemId) ?? null) : null;
  };
}
