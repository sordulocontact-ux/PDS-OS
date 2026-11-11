import "server-only";

import { selectBudgetLines, toBudgetLines } from "@/lib/budget/rows";
import type { BudgetLine } from "@/lib/budget/types";
import { listProjects } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

// Enough for the team's spends for a long while; said on the page past it.
export const EXPENSES_LIMIT = 1000;

/** A spend of the Dépenses page: its artist (a project's by the rule every
 * page reads) and whether the reader writes it. */
export type Expense = BudgetLine & {
  artistName: string | null;
  writable: boolean;
};

/**
 * Every spend the reader may see (BUD 3), projects' and artists', newest
 * first, read with the user's session: a project's lines for its budget's
 * readers, an artist's for the artists' budgets' readers (RLS). Written by
 * the reader: an artist's spends, and the lines of the projects they run.
 */
export async function loadExpenses(personId: string | null): Promise<{
  expenses: Expense[];
  truncated: boolean;
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await selectBudgetLines(supabase)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(EXPENSES_LIMIT + 1);
  if (error) console.error("loadExpenses:", error.message);
  const rows = (data ?? []).slice(0, EXPENSES_LIMIT);
  const projectIds = [
    ...new Set(rows.flatMap((r) => (r.project_id ? [r.project_id] : []))),
  ];
  const [lines, live, archived] = await Promise.all([
    toBudgetLines(supabase, rows),
    listProjects({ ids: projectIds }),
    listProjects({ ids: projectIds, archived: true }),
  ]);
  const projects = new Map(
    [...live.projects, ...archived.projects].map((p) => [p.id, p]),
  );
  return {
    expenses: lines.map((line) => {
      const project =
        line.target.kind === "project" ? projects.get(line.target.id) : null;
      return {
        ...line,
        artistName:
          line.target.kind === "artist"
            ? line.targetLabel
            : project?.artistName || null,
        writable:
          line.target.kind === "artist" ||
          (personId !== null && project?.ownerPersonId === personId),
      };
    }),
    truncated: (data ?? []).length > EXPENSES_LIMIT,
    error: Boolean(error),
  };
}
