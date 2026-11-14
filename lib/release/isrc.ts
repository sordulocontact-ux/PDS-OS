import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/** What the detection searches a release with. */
export type ReleaseLookup = { isrc: string } | { upc: string };

type LookupRelease = {
  id: string;
  project_id: string;
  isrc: string | null;
  upc?: string | null;
  project_title_id?: string | null;
};

/**
 * What the detection searches each release with (docs/pds-mic-plan.md
 * § 3 bis, point 4):
 * - a simple project's release: the Catalogue's ISRC (the first title of the
 *   project that has one, CA03: referenced, never typed in the
 *   Distribution), else an ISRC the release kept from before (unchanged);
 * - a collective's title's release: the ISRC of that title's master;
 * - a collective's compilation: its UPC only, never the ISRC of one of its
 *   titles (it would find the title's own release); without a UPC it waits.
 * A release with nothing to search with is left out.
 */
export async function releaseLookups(
  supabase: SupabaseClient<Database>,
  releases: LookupRelease[],
): Promise<Map<string, ReleaseLookup>> {
  const projects = [...new Set(releases.map((r) => r.project_id))];
  const titleIds = releases.flatMap((r) =>
    r.project_title_id ? [r.project_title_id] : [],
  );
  const none = Promise.resolve({ data: [], error: null });
  const [masters, collectives, titles] = await Promise.all([
    projects.length
      ? supabase
          .from("project_masters")
          .select(
            "project_id, position, master:masters!project_masters_master_same_org(isrc)",
          )
          .in("project_id", projects)
          .order("position")
      : none,
    projects.length
      ? supabase.from("projects").select("id, collective").in("id", projects)
      : none,
    titleIds.length
      ? supabase
          .from("project_titles")
          .select("id, master_id")
          .in("id", titleIds)
      : none,
  ]);
  for (const res of [masters, collectives, titles])
    if (res.error) console.error("releaseLookups:", res.error.message);
  // A title's master and its ISRC (the title's link goes through the
  // project's masters, not straight to the Catalogue).
  const titleMasters = (titles.data ?? []).flatMap((t) =>
    t.master_id ? [t.master_id] : [],
  );
  const isrcs = titleMasters.length
    ? await supabase.from("masters").select("id, isrc").in("id", titleMasters)
    : { data: [], error: null };
  if (isrcs.error)
    console.error("releaseLookups masters:", isrcs.error.message);
  const isrcOf = new Map(
    (isrcs.data ?? []).flatMap((m) =>
      m.isrc ? [[m.id, m.isrc] as const] : [],
    ),
  );
  const byProject = new Map<string, string>();
  for (const row of masters.data ?? [])
    if (row.master?.isrc && !byProject.has(row.project_id))
      byProject.set(row.project_id, row.master.isrc);
  const collective = new Set(
    (collectives.data ?? []).filter((p) => p.collective).map((p) => p.id),
  );
  const byTitle = new Map(
    (titles.data ?? []).flatMap((t) => {
      const isrc = t.master_id ? isrcOf.get(t.master_id) : undefined;
      return isrc ? [[t.id, isrc] as const] : [];
    }),
  );
  const out = new Map<string, ReleaseLookup>();
  for (const r of releases) {
    if (r.project_title_id) {
      const isrc = byTitle.get(r.project_title_id);
      if (isrc) out.set(r.id, { isrc });
      continue;
    }
    if (collective.has(r.project_id)) {
      if (r.upc) out.set(r.id, { upc: r.upc });
      continue;
    }
    const isrc = byProject.get(r.project_id) ?? r.isrc;
    if (isrc) out.set(r.id, { isrc });
  }
  return out;
}
