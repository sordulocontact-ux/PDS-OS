import "server-only";

import {
  loadArtistIdentity,
  type IdentityVersion,
} from "@/lib/catalog/artist-identity";
import type { Member } from "@/lib/framing/related";
import { createClient } from "@/lib/supabase/server";

// The artist's identity as a release reads it (MKT-C2-04): the version its
// Conception uses (set when the work opened, never rewritten), the newer
// one if any, the release's deviation, and the identity's links already
// copied into its references.

export type ReleaseIdentity = {
  artistId: string | null;
  // The version the Conception uses; before the start, the current one.
  used: IdentityVersion | null;
  // A newer approved version than the one used.
  newer: IdentityVersion | null;
  deviation: { text: string; byName: string | null; at: string } | null;
  // Links of the identity already among the release's references.
  copiedUrls: string[];
};

export async function loadReleaseIdentity(
  projectId: string,
  members: Member[],
): Promise<ReleaseIdentity> {
  const supabase = await createClient();
  const [artistRes, workspaceRes, refsRes] = await Promise.all([
    supabase.rpc("project_artist_id", { p_project_id: projectId }),
    supabase
      .from("design_workspaces")
      .select(
        "identity_version_id, identity_deviation, identity_deviation_by, identity_deviation_at",
      )
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("design_references")
      .select("url")
      .eq("project_id", projectId)
      .not("identity_version_id", "is", null),
  ]);
  const artistId = artistRes.data ?? null;
  if (!artistId)
    return {
      artistId: null,
      used: null,
      newer: null,
      deviation: null,
      copiedUrls: [],
    };
  const identity = await loadArtistIdentity(artistId, members);
  const ws = workspaceRes.data;
  const used =
    (ws
      ? identity.versions.find((v) => v.id === ws.identity_version_id)
      : identity.current) ?? null;
  const newer =
    identity.current && used && identity.current.number > used.number
      ? identity.current
      : !used && ws
        ? identity.current
        : null;
  return {
    artistId,
    used,
    newer,
    deviation:
      ws?.identity_deviation && ws.identity_deviation_at
        ? {
            text: ws.identity_deviation,
            byName:
              members.find((m) => m.personId === ws.identity_deviation_by)
                ?.name ?? null,
            at: ws.identity_deviation_at,
          }
        : null,
    copiedUrls: (refsRes.data ?? []).flatMap((r) => (r.url ? [r.url] : [])),
  };
}
