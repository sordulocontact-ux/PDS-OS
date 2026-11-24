import "server-only";

import { partNamesOf, type BudgetPart } from "@/lib/finance/budget-envelope";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import { createClient } from "@/lib/supabase/server";

/**
 * The parts of one budget and the part of each spend that has one, for
 * whoever reads Finance (20261120120101_finance_budget_envelopes.sql). Read
 * with the session.
 */
export async function loadBudgetParts(
  kind: EnvelopeKind,
  id: string,
): Promise<{
  parts: BudgetPart[];
  partOf: Record<string, string>;
  error: boolean;
}> {
  const supabase = await createClient();
  const [parts, lines] = await Promise.all([
    supabase
      .from("finance_budget_parts")
      .select("id, name, amount_cents")
      .eq("target_kind", kind)
      .eq("target_id", id)
      .order("created_at"),
    supabase.rpc("finance_budget_part_lines"),
  ]);
  for (const [name, result] of Object.entries({ parts, lines }))
    if (result.error)
      console.error(`loadBudgetParts (${name}):`, result.error.message);
  return {
    parts: (parts.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      amountCents: Number(p.amount_cents),
    })),
    partOf: Object.fromEntries(
      (lines.data ?? []).map((l) => [l.line_id, l.part_id]),
    ),
    error: Boolean(parts.error || lines.error),
  };
}

/**
 * Spend id → the name of the sub-budget it is filed in, every budget of the
 * label (Finance › Dépenses shows it on each spend, UX test of 23/11/2026).
 */
export async function loadSpendPartNames(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const [parts, lines] = await Promise.all([
    supabase.from("finance_budget_parts").select("id, name"),
    supabase.rpc("finance_budget_part_lines"),
  ]);
  for (const [name, result] of Object.entries({ parts, lines }))
    if (result.error)
      console.error(`loadSpendPartNames (${name}):`, result.error.message);
  return partNamesOf(
    (parts.data ?? []).map((p) => ({ id: p.id, name: p.name })),
    Object.fromEntries((lines.data ?? []).map((l) => [l.line_id, l.part_id])),
  );
}
