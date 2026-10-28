import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { createClient } from "@/lib/supabase/server";

// Read once per request: the workflow statuses and the Distribution's
// sources both need them in the same render (page loads audit,
// docs/ARCHITECTURE.md § 3 bis).

/** The cover delivered by the Production (distribution_cover). */
export const distributionCover = trackedCache(async (projectId: string) => {
  const supabase = await createClient();
  return supabase.rpc("distribution_cover", { p_project_id: projectId });
});

/** The borrowings still to secure, readable without the Juridique
 * (distribution_legal_blockers). */
export const distributionLegalBlockers = trackedCache(
  async (projectId: string) => {
    const supabase = await createClient();
    return supabase.rpc("distribution_legal_blockers", {
      p_project_id: projectId,
    });
  },
);
