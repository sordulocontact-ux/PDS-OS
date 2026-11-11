import "server-only";

import { identityMismatchArtist } from "@/lib/design/identity-mismatch";
import { createClient } from "@/lib/supabase/server";

// The artist's identity as the Brief créatif states it (MKT-C2-04): the
// version the Conception uses — never a later one — and the release's
// deviation. Absent when there is neither, so a Brief without identity
// stays the same content as before.

export type BriefIdentity = {
  version: number;
  approvedOn: string | null;
  manifesto: string | null;
  tone: string | null;
  deviation: string | null;
  // A collective whose main artist changed: the artist the kept identity
  // belongs to (it no longer matches the main artist). Absent otherwise, so
  // any other Brief keeps the same content.
  mismatchArtist?: string;
};

export async function loadBriefIdentity(
  projectId: string,
): Promise<BriefIdentity | null> {
  const supabase = await createClient();
  const { data: ws } = await supabase
    .from("design_workspaces")
    .select("identity_version_id, identity_deviation")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!ws || (!ws.identity_version_id && !ws.identity_deviation)) return null;
  const [{ data: v }, mismatch] = await Promise.all([
    ws.identity_version_id
      ? supabase
          .from("artist_identity_versions")
          .select("number, decided_at, manifesto, tone")
          .eq("id", ws.identity_version_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    identityMismatchArtist(supabase, projectId, ws.identity_version_id),
  ]);
  return {
    version: v?.number ?? 0,
    approvedOn: v?.decided_at?.slice(0, 10) ?? null,
    manifesto: v?.manifesto ?? null,
    tone: v?.tone ?? null,
    deviation: ws.identity_deviation,
    ...(mismatch !== null ? { mismatchArtist: mismatch } : {}),
  };
}
