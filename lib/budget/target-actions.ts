"use server";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import type { ExpenseTarget } from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";
import { createClient } from "@/lib/supabase/server";

// How many of the reader's last targets lead the list.
const RECENT = 5;

/**
 * What a quick spend can go to (BUD 4), for the reader: the projects they
 * run (not archived) and, for the artists' budgets' readers, every artist
 * not archived; for the Finance (manage_finance, lot 3 of Ibé's ticket),
 * its cost centers and « Hors budget »; the ones they last spent on
 * first, then « Hors budget » (a structure spend must be found, UX test of
 * 15/11/2026), then by name; each with the sub-budgets the reader may see
 * (24/11/2026: the Finance all, a project's owner their project's). Read
 * with the user's session; the database still decides on saving.
 */
export async function loadExpenseTargets(): Promise<{
  organizationId: string | null;
  targets: ExpenseTarget[];
}> {
  const access = await requireApproved();
  if (!access.organizationId || !access.personId)
    return { organizationId: null, targets: [] };
  const supabase = await createClient();
  const artists = can(access, "read_artist_budgets");
  const finance = can(access, "manage_finance");
  const [projectsRes, artistsRes, recentRes, centersRes, partsRes] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, title")
        .eq("owner_person_id", access.personId)
        .is("archived_at", null)
        .order("title"),
      artists
        ? supabase
            .from("artists")
            .select("id, name")
            .is("archived_at", null)
            .order("name")
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("budget_lines")
        .select("project_id, artist_id, cost_center_id")
        .eq("created_by", access.personId)
        .order("created_at", { ascending: false })
        .limit(50),
      finance
        ? supabase
            .from("finance_cost_centers")
            .select("id, name")
            .is("archived_at", null)
            .order("name")
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("finance_budget_parts")
        .select("id, name, target_kind, target_id")
        .order("created_at"),
    ]);
  const partsOf = (kind: string, id: string) =>
    (partsRes.data ?? [])
      .filter((p) => p.target_kind === kind && p.target_id === id)
      .map((p) => ({ id: p.id, name: p.name }));
  const all: ExpenseTarget[] = [
    ...(projectsRes.data ?? []).map((p) => ({
      kind: "project" as const,
      id: p.id,
      label: p.title,
    })),
    ...(artistsRes.data ?? []).map((a) => ({
      kind: "artist" as const,
      id: a.id,
      label: a.name,
    })),
    ...(centersRes.data ?? []).map((c) => ({
      kind: "cost_center" as const,
      id: c.id,
      label: c.name,
    })),
  ].sort((a, b) => a.label.localeCompare(b.label, "fr"));
  // « Hors budget »: named by what goes there, so a search finds it.
  const offBudget: ExpenseTarget[] = finance
    ? [{ kind: "off_budget", id: "", label: budget.form.offBudgetOption }]
    : [];
  const recent: string[] = [];
  for (const row of recentRes.data ?? []) {
    const id = row.project_id ?? row.artist_id ?? row.cost_center_id;
    if (id && !recent.includes(id)) recent.push(id);
    if (recent.length === RECENT) break;
  }
  const rank = (t: ExpenseTarget) => {
    const i = recent.indexOf(t.id);
    return i === -1 ? RECENT : i;
  };
  const sorted = all
    .map((t) => ({
      ...t,
      recent: recent.includes(t.id),
      parts: partsOf(t.kind, t.id),
    }))
    .sort((a, b) => rank(a) - rank(b));
  return {
    organizationId: access.organizationId,
    targets: [
      ...sorted.filter((t) => t.recent),
      ...offBudget,
      ...sorted.filter((t) => !t.recent),
    ],
  };
}
