"use server";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import type { ExpenseTarget } from "@/lib/budget/types";
import { createClient } from "@/lib/supabase/server";

// How many of the reader's last targets lead the list.
const RECENT = 5;

/**
 * What a quick spend can go to (BUD 4), for the reader: the projects they
 * run (not archived) and, for the artists' budgets' readers, every artist
 * not archived; the ones they last spent on first, then by name. Read with
 * the user's session; the database still decides on saving.
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
  const [projectsRes, artistsRes, recentRes] = await Promise.all([
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
      .select("project_id, artist_id")
      .eq("created_by", access.personId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
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
  ].sort((a, b) => a.label.localeCompare(b.label, "fr"));
  const recent: string[] = [];
  for (const row of recentRes.data ?? []) {
    const id = row.project_id ?? row.artist_id;
    if (id && !recent.includes(id)) recent.push(id);
    if (recent.length === RECENT) break;
  }
  const rank = (t: ExpenseTarget) => {
    const i = recent.indexOf(t.id);
    return i === -1 ? RECENT : i;
  };
  return {
    organizationId: access.organizationId,
    targets: all
      .map((t) => ({ ...t, recent: recent.includes(t.id) }))
      .sort((a, b) => rank(a) - rank(b)),
  };
}
