import "server-only";

import type { BudgetPart } from "@/lib/finance/budget-envelope";
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
