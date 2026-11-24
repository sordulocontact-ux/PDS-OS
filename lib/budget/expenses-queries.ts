import "server-only";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { selectBudgetLines, toBudgetLines } from "@/lib/budget/rows";
import type { BudgetLine } from "@/lib/budget/types";
import { listProjects } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

// Enough for the team's spends for a long while; said on the page past it.
export const EXPENSES_LIMIT = 1000;

/** A spend of the Dépenses page: its artist (a project's by the rule every
 * page reads), whether the reader writes it and whether as the Finance (a
 * project they do not run: its proof goes to finance-files). */
export type Expense = BudgetLine & {
  artistName: string | null;
  writable: boolean;
  byFinance: boolean;
};

/**
 * Every spend the reader may see (BUD 3), projects' and artists', newest
 * first, read with the user's session: a project's lines for its budget's
 * readers, an artist's for the artists' budgets' readers (RLS). Written by
 * the reader: an artist's spends, the lines of the projects they run, and
 * every spend for the Finance (manage_finance, 24/11/2026).
 */
export async function loadExpenses(personId: string | null): Promise<{
  expenses: Expense[];
  truncated: boolean;
  error: boolean;
}> {
  const [supabase, access] = await Promise.all([
    createClient(),
    requireApproved(),
  ]);
  const finance = can(access, "manage_finance");
  const { data, error } = await selectBudgetLines(supabase)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(EXPENSES_LIMIT + 1);
  if (error) console.error("loadExpenses:", error.message);
  const rows = (data ?? []).slice(0, EXPENSES_LIMIT);
  const projectIds = [
    ...new Set(rows.flatMap((r) => (r.project_id ? [r.project_id] : []))),
  ];
  const [lines, live, archived, financeProjects] = await Promise.all([
    toBudgetLines(supabase, rows),
    listProjects({ ids: projectIds }),
    listProjects({ ids: projectIds, archived: true }),
    // The names of the projects the Finance does not see by table (a
    // business manager), as Finance › Budgets reads them.
    finance && projectIds.length
      ? supabase.rpc("finance_projects")
      : Promise.resolve({ data: [], error: null }),
  ]);
  const projects = new Map(
    [...live.projects, ...archived.projects].map((p) => [p.id, p]),
  );
  const titleOf = new Map(
    (financeProjects.data ?? []).map((p) => [p.project_id, p.title]),
  );
  return {
    expenses: lines.map((line) => {
      const project =
        line.target.kind === "project" ? projects.get(line.target.id) : null;
      const runs = personId !== null && project?.ownerPersonId === personId;
      return {
        ...line,
        targetLabel:
          line.targetLabel ??
          (line.target.kind === "project"
            ? (titleOf.get(line.target.id) ?? null)
            : null),
        artistName:
          line.target.kind === "artist"
            ? line.targetLabel
            : project?.artistName || null,
        writable: line.target.kind === "artist" || runs || finance,
        byFinance: line.target.kind === "project" && !runs,
      };
    }),
    truncated: (data ?? []).length > EXPENSES_LIMIT,
    error: Boolean(error),
  };
}
