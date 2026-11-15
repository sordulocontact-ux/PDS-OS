import "server-only";

import { financeExports } from "@/lib/i18n/fr/finance-exports";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type HistoryEntry = {
  id: string;
  at: string;
  who: string | null;
  entity: string;
  action: string;
  // What it is: its label, name or number, when it has one.
  name: string | null;
  // The fields that changed, in words (an update only).
  fields: string[];
};

// Columns every change touches, never worth naming.
const NOISE = new Set([
  "updated_at",
  "updated_by",
  "created_at",
  "created_by",
  "seq",
]);

const nameOf = (row: Record<string, unknown>) => {
  const value =
    row.label ??
    row.name ??
    row.number ??
    row.invoice_number ??
    row.vendor ??
    row.file_name ??
    row.counterparty;
  return typeof value === "string" && value.trim() ? value : null;
};

/** The changed fields in words, each once; a technical column with no word
 * is left out rather than named « autres champs ». */
function fieldsOf(keys: string[]) {
  const t = financeExports;
  const named = keys.map((k) => t.fields[k as keyof typeof t.fields]);
  return [...new Set(named.filter(Boolean))] as string[];
}

const EVENT_COLUMNS =
  "id, created_at, entity, action, before, after, actor:people(first_name, last_name)";

export const HISTORY_PAGE = 20;

/** A page of the changes of Finance, the latest first (finance_events,
 * written by trigger): who, when, what, which fields, and how many there
 * are in all. Read with the session (read_finance). */
export async function loadHistory(
  offset = 0,
  limit = HISTORY_PAGE,
): Promise<{ entries: HistoryEntry[]; total: number }> {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("finance_events")
    .select(EVENT_COLUMNS, { count: "exact" })
    .order("seq", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) console.error("loadHistory:", error.message);
  return { entries: toEntries(data ?? []), total: count ?? 0 };
}

/** The changes of one record (a spend, an income, a bank transaction): the
 * history at the foot of Finance's side sheet (lot 3, docs/FINANCE-V2.md).
 * Read with the session: RLS keeps it to who reads Finance. */
export async function loadRowHistory(rowId: string): Promise<HistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_events")
    .select(EVENT_COLUMNS)
    .eq("row_id", rowId)
    .order("seq", { ascending: false })
    .limit(50);
  if (error) console.error("loadRowHistory:", error.message);
  return toEntries(data ?? []);
}

type EventRow = {
  id: string;
  created_at: string;
  entity: string;
  action: string;
  before: unknown;
  after: unknown;
  actor: { first_name: string | null; last_name: string | null } | null;
};

function toEntries(rows: EventRow[]): HistoryEntry[] {
  const t = financeExports;
  return rows.map((e) => {
    const before = (e.before ?? {}) as Record<string, unknown>;
    const after = (e.after ?? {}) as Record<string, unknown>;
    const changed =
      e.action === "update"
        ? Object.keys(after).filter(
            (k) =>
              !NOISE.has(k) &&
              JSON.stringify(before[k]) !== JSON.stringify(after[k]),
          )
        : [];
    return {
      id: e.id,
      at: e.created_at,
      who: e.actor ? personName(e.actor.first_name, e.actor.last_name) : null,
      entity: t.entities[e.entity as keyof typeof t.entities] ?? t.entityOther,
      action: t.actions[e.action as keyof typeof t.actions] ?? e.action,
      name: nameOf({ ...before, ...after }),
      fields: fieldsOf(changed),
    };
  });
}
