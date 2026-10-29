import "server-only";

import {
  distributionStateOf,
  type DistributionState,
} from "@/lib/catalog/master/title-status";
import { createClient } from "@/lib/supabase/server";

// Distribution state of the title overview ("master" in the code), computed
// here, never by the model. The dossier is lib/catalog/master/dossier.ts.

/**
 * The distribution state of a title across its live projects (retour
 * Catalogue 01), read with the viewer's session: what RLS hides does not
 * count.
 */
export async function loadDistributionState(
  projectIds: string[],
): Promise<DistributionState> {
  if (projectIds.length === 0) return "not_prepared";
  const supabase = await createClient();
  const [releases, deposits, dossiers] = await Promise.all([
    supabase
      .from("releases")
      .select("online_detected_at, planned_release_date")
      .in("project_id", projectIds),
    supabase
      .from("distribution_declarations")
      .select("id")
      .in("project_id", projectIds)
      .eq("kind", "deposit")
      .is("withdrawn_at", null)
      .limit(1),
    supabase
      .from("distribution_dossiers")
      .select("id")
      .in("project_id", projectIds)
      .limit(1),
  ]);
  for (const result of [releases, deposits, dossiers])
    if (result.error)
      console.error("loadDistributionState:", result.error.message);
  const rows = releases.data ?? [];
  return distributionStateOf({
    online: rows.some((r) => r.online_detected_at !== null),
    delivered: (deposits.data ?? []).length > 0,
    preparing:
      (dossiers.data ?? []).length > 0 ||
      rows.some((r) => r.planned_release_date !== null),
  });
}
