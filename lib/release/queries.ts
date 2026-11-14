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

/**
 * Which release of a project (docs/pds-mic-plan.md § 3 bis, point 6):
 * - project: the project's release — a simple project's only one, a
 *   collective's compilation (none in « singles »);
 * - title: a collective's title's release.
 */
export type ReleaseSelector =
  { kind: "project" } | { kind: "title"; titleId: string };

/** The project's release, as every project-level page reads it. */
export const PROJECT_RELEASE: ReleaseSelector = { kind: "project" };

const RELEASE_COLUMNS =
  "id, organization_id, project_id, project_title_id, title, isrc, upc, planned_release_date, spotify_url, online_detected_at, last_checked_at, smartlink_token, smartlink_enabled, created_by, created_at, updated_at, delivered_on, delivered_to_contact_id, delivery_note, delivery_recorded_by, delivery_recorded_at, online_confirmed_on, online_confirmed_url, online_confirmed_by, archived_at, archived_by";

/**
 * The one access to « a release » (lot 13), replacing the reads that took
 * the oldest release of a project. A simple project: its release, as
 * before. A collective: the release asked for — a title's, or the
 * compilation (the project's release) — never one picked in silence: asked
 * without a selector, it throws. Archived lines (a mode no longer uses
 * them) are never read here. Reads with the caller's client (RLS).
 */
export async function loadRelease(
  supabase: Client,
  projectId: string,
  selector?: ReleaseSelector,
): Promise<ReleaseRow | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("collective")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw new Error(`projects: ${projectError.message}`);
  if (!project) return null;
  if (project.collective && !selector)
    throw new Error("release_selector_required");
  const query = supabase
    .from("releases")
    .select(RELEASE_COLUMNS)
    .eq("project_id", projectId)
    .is("archived_at", null);
  const filtered =
    selector?.kind === "title"
      ? query.eq("project_title_id", selector.titleId)
      : query.is("project_title_id", null);
  const { data, error } = await filtered
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`releases: ${error.message}`);
  return data;
}

/**
 * The project and one of its releases (a simple project's, or the one the
 * selector names for a collective) with its platform links. Returns null
 * when the project does not exist or is not visible.
 */
export async function getProjectRelease(
  supabase: Client,
  projectId: string,
  selector?: ReleaseSelector,
): Promise<ProjectRelease | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw new Error(`projects: ${projectError.message}`);
  if (!project) return null;

  const release = await loadRelease(supabase, projectId, selector);

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
