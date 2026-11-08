import "server-only";

import {
  type ArtistExpense,
  type ArtistProjectSpend,
  isArtistExpenseCategory,
  isArtistExpenseStatus,
} from "@/lib/catalog/artist-expenses";
import { createClient } from "@/lib/supabase/server";

// Engagé, facturé or payé (lib/budget budgetTotals: committedCents).
const OWED = new Set(["committed", "invoiced", "paid"]);

/**
 * The « Budget » tab of an artist: its own spends, newest first, and what
 * each of its projects owes. Read with the viewer's session: the spends need
 * manage_catalog, a project's lines its owner or the direction (RLS), so a
 * project manager adds up the projects they may read.
 */
export async function loadArtistBudget(artistId: string): Promise<{
  expenses: ArtistExpense[];
  projects: ArtistProjectSpend[];
  error: boolean;
}> {
  const supabase = await createClient();
  const [expensesRes, projectsRes] = await Promise.all([
    supabase
      .from("artist_expenses")
      .select(
        "id, label, amount_cents, category, category_detail, spent_on, status, note",
      )
      .eq("artist_id", artistId)
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title, budget_lines(amount_cents, status)")
      .eq("artist_id", artistId)
      .is("archived_at", null)
      .order("created_at"),
  ]);
  const failed = expensesRes.error ?? projectsRes.error;
  if (failed) console.error("loadArtistBudget:", failed.message);

  const expenses = (expensesRes.data ?? []).flatMap((row) =>
    isArtistExpenseCategory(row.category) && isArtistExpenseStatus(row.status)
      ? [
          {
            id: row.id,
            label: row.label,
            amountCents: row.amount_cents,
            category: row.category,
            categoryDetail: row.category_detail,
            spentOn: row.spent_on,
            status: row.status,
            note: row.note,
          },
        ]
      : [],
  );
  // A project whose budget the viewer may not read has no line back: left
  // out rather than shown at zero.
  const projects = (projectsRes.data ?? [])
    .filter((project) => project.budget_lines.length > 0)
    .map((project) => ({
      projectId: project.id,
      title: project.title,
      committedCents: project.budget_lines
        .filter((line) => OWED.has(line.status))
        .reduce((total, line) => total + line.amount_cents, 0),
    }));
  return { expenses, projects, error: Boolean(failed) };
}
