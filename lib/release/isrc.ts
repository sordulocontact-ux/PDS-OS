import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * The ISRC the detection searches with: the Catalogue's (the first title of
 * the project that has one, CA03: referenced, never typed in the
 * Distribution), else an ISRC the release kept from before.
 */
export async function releaseIsrcs(
  supabase: SupabaseClient<Database>,
  releases: Array<{ id: string; project_id: string; isrc: string | null }>,
): Promise<Map<string, string>> {
  const projects = [...new Set(releases.map((r) => r.project_id))];
  const { data, error } = projects.length
    ? await supabase
        .from("project_masters")
        .select(
          "project_id, position, master:masters!project_masters_master_same_org(isrc)",
        )
        .in("project_id", projects)
        .order("position")
    : { data: [], error: null };
  if (error) console.error("releaseIsrcs:", error.message);
  const byProject = new Map<string, string>();
  for (const row of data ?? [])
    if (row.master?.isrc && !byProject.has(row.project_id))
      byProject.set(row.project_id, row.master.isrc);
  const out = new Map<string, string>();
  for (const r of releases) {
    const isrc = byProject.get(r.project_id) ?? r.isrc;
    if (isrc) out.set(r.id, isrc);
  }
  return out;
}
