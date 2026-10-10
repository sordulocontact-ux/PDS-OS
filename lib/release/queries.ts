import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type ReleaseRow = Database["public"]["Tables"]["releases"]["Row"];
export type ReleaseLinkRow =
  Database["public"]["Tables"]["release_links"]["Row"];

export type ProjectRelease = {
  project: { id: string; title: string; organizationId: string };
  release: ReleaseRow | null;
  links: ReleaseLinkRow[];
};

const RELEASE_COLUMNS =
  "id, organization_id, project_id, title, isrc, upc, planned_release_date, spotify_url, online_detected_at, last_checked_at, smartlink_token, smartlink_enabled, created_by, created_at, updated_at, delivered_on, delivered_to_contact_id, delivery_note, delivery_recorded_by, delivery_recorded_at, online_confirmed_on, online_confirmed_url, online_confirmed_by";

/**
 * The project and its release (V1: one release per project, the oldest).
 * Reads with the caller's client: RLS decides what is visible.
 * Returns null when the project does not exist or is not visible.
 */
export async function getProjectRelease(
  supabase: Client,
  projectId: string,
): Promise<ProjectRelease | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw new Error(`projects: ${projectError.message}`);
  if (!project) return null;

  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select(RELEASE_COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (releaseError) throw new Error(`releases: ${releaseError.message}`);

  let links: ReleaseLinkRow[] = [];
  if (release) {
    const { data, error } = await supabase
      .from("release_links")
      .select("*")
      .eq("release_id", release.id)
      .order("platform");
    if (error) throw new Error(`release_links: ${error.message}`);
    links = data;
  }

  return {
    project: {
      id: project.id,
      title: project.title,
      organizationId: project.organization_id,
    },
    release,
    links,
  };
}
