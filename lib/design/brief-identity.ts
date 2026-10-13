import "server-only";

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
  const { data: v } = ws.identity_version_id
    ? await supabase
        .from("artist_identity_versions")
        .select("number, decided_at, manifesto, tone")
        .eq("id", ws.identity_version_id)
        .maybeSingle()
    : { data: null };
  return {
    version: v?.number ?? 0,
    approvedOn: v?.decided_at?.slice(0, 10) ?? null,
    manifesto: v?.manifesto ?? null,
    tone: v?.tone ?? null,
    deviation: ws.identity_deviation,
  };
}
