import "server-only";

import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export type ReleaseOverview = {
  projectId: string;
  title: string;
  plannedDate: string | null;
  onlineSince: string | null;
  platforms: number;
  href: string;
};

/** Releases with their online status and detected platform count (manual links excluded). */
export async function loadReleasesOverview(
  limit = 5,
): Promise<ReleaseOverview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("releases")
    .select(
      "project_id, title, planned_release_date, online_detected_at, release_links(source)",
    )
    .order("planned_release_date", { ascending: true, nullsFirst: false })
    .limit(limit);
  // A failed read is said by the caller, never shown as « no release ».
  if (error) throw new Error(`loadReleasesOverview: ${error.message}`);
  return (data ?? []).map((r) => ({
    projectId: r.project_id,
    title: r.title,
    plannedDate: r.planned_release_date,
    onlineSince: r.online_detected_at,
    platforms: (r.release_links ?? []).filter((l) => l.source !== "manual")
      .length,
    href: routes.projectReleaseOnline(r.project_id),
  }));
}
