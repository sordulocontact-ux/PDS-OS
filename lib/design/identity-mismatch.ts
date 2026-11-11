import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

/**
 * A collective whose main artist changed after its Conception chose an
 * identity (docs/pds-mic-plan.md, § 6 risque 2): the identity is kept, never
 * replaced in silence, and this names the artist it belongs to so the page
 * can say it no longer matches the main artist. Null when it matches, when
 * no identity is kept, and for any project that is not collective (their
 * behaviour is unchanged).
 */
export async function identityMismatchArtist(
  supabase: SupabaseClient<Database>,
  projectId: string,
  versionId: string | null,
): Promise<string | null> {
  if (!versionId) return null;
  const [project, version, main] = await Promise.all([
    supabase
      .from("projects")
      .select("collective")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("artist_identity_versions")
      .select("artist_id")
      .eq("id", versionId)
      .maybeSingle(),
    supabase.rpc("project_artist_id", { p_project_id: projectId }),
  ]);
  const keptArtist = version.data?.artist_id;
  if (!project.data?.collective || !keptArtist || !main.data) return null;
  if (keptArtist === main.data) return null;
  const { data: artist } = await supabase
    .from("artists")
    .select("name")
    .eq("id", keptArtist)
    .maybeSingle();
  return artist?.name ?? "";
}
