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
  const value = row.label ?? row.name ?? row.number ?? row.invoice_number;
  return typeof value === "string" && value.trim() ? value : null;
};

/** The changed fields in words, each once; technical ones folded into
 * « autres champs ». */
function fieldsOf(keys: string[]) {
  const t = financeExports;
  const named = keys.map((k) => t.fields[k as keyof typeof t.fields]);
  const words = [...new Set(named.filter(Boolean))] as string[];
  return named.some((n) => !n) ? [...words, t.history.otherFields] : words;
}

/** The last changes of Finance (finance_events, written by trigger): who,
 * when, what, which fields. Read with the session (read_finance). */
export async function loadHistory(limit = 100): Promise<HistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_events")
    .select(
      "id, created_at, entity, action, before, after, actor:people(first_name, last_name)",
    )
    .order("seq", { ascending: false })
    .limit(limit);
  if (error) console.error("loadHistory:", error.message);
  const t = financeExports;
  return (data ?? []).map((e) => {
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
      entity: t.entities[e.entity as keyof typeof t.entities] ?? e.entity,
      action: t.actions[e.action as keyof typeof t.actions] ?? e.action,
      name: nameOf({ ...before, ...after }),
      fields: fieldsOf(changed),
    };
  });
}
