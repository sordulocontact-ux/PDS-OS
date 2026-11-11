import "server-only";

import { selectBudgetLines, toBudgetLines } from "@/lib/budget/rows";
import type {
  BudgetDeliverable,
  BudgetLever,
  BudgetLine,
} from "@/lib/budget/types";
import { createClient } from "@/lib/supabase/server";

export type BudgetData = {
  error: boolean;
  lines: BudgetLine[];
  // Selected levers of the project, the ones a spend can serve.
  levers: BudgetLever[];
  // Its deliverables, the ones a spend can pay for (MKT-S1-12).
  deliverables: BudgetDeliverable[];
};

/** The budget lines of a project, read with the user's session (RLS). */
export async function loadBudget(projectId: string): Promise<BudgetData> {
  const supabase = await createClient();
  const [linesRes, leversRes, deliverablesRes] = await Promise.all([
    selectBudgetLines(supabase).eq("project_id", projectId).order("created_at"),
    supabase
      .from("levers")
      .select("id, label")
      .eq("project_id", projectId)
      .eq("state", "selected")
      .eq("review_status", "confirmed")
      .order("created_at"),
    supabase
      .from("strategy_deliverables")
      .select("id, title, lever_id")
      .eq("project_id", projectId)
      .order("created_at"),
  ]);

  if (linesRes.error) console.error("loadBudget:", linesRes.error.message);
  return {
    error: Boolean(linesRes.error),
    lines: await toBudgetLines(supabase, linesRes.data ?? []),
    levers: leversRes.data ?? [],
    deliverables: (deliverablesRes.data ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      leverId: d.lever_id,
    })),
  };
}

/** The direct spends of an artist (BUD 1), newest first (RLS: whoever
 * reads the artists' budgets). */
export async function loadArtistLines(
  artistId: string,
): Promise<{ lines: BudgetLine[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await selectBudgetLines(supabase)
    .eq("artist_id", artistId)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) console.error("loadArtistLines:", error.message);
  return {
    lines: await toBudgetLines(supabase, data ?? []),
    error: Boolean(error),
  };
}
