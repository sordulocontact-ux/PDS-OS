import "server-only";

import {
  isBudgetFamily,
  isBudgetStatus,
  type BudgetLever,
  type BudgetLine,
} from "@/lib/budget/types";
import { createClient } from "@/lib/supabase/server";

export type BudgetData = {
  error: boolean;
  lines: BudgetLine[];
  // Selected levers of the project, the ones a spend can serve.
  levers: BudgetLever[];
};

/** The budget lines of a project, read with the user's session (RLS). */
export async function loadBudget(projectId: string): Promise<BudgetData> {
  const supabase = await createClient();
  const [linesRes, leversRes] = await Promise.all([
    supabase
      .from("budget_lines")
      .select(
        "id, label, amount_cents, status, family, lever_id, note, lever:levers!budget_lines_lever_same_org(label)",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("levers")
      .select("id, label")
      .eq("project_id", projectId)
      .eq("state", "selected")
      .eq("review_status", "confirmed")
      .order("created_at"),
  ]);

  if (linesRes.error) console.error("loadBudget:", linesRes.error.message);
  const lines = (linesRes.data ?? []).map((row): BudgetLine => ({
    id: row.id,
    label: row.label,
    amountCents: row.amount_cents,
    status: isBudgetStatus(row.status) ? row.status : "planned",
    family: isBudgetFamily(row.family) ? row.family : null,
    leverId: row.lever_id,
    leverLabel: row.lever?.label ?? null,
    note: row.note,
  }));
  return {
    error: Boolean(linesRes.error),
    lines,
    levers: leversRes.data ?? [],
  };
}
