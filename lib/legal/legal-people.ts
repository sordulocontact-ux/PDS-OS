import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { createClient } from "@/lib/supabase/server";

/**
 * The organization's members who may hold a legal task
 * (list_legal_people), read once per request: the Juridique's plan,
 * tracking, clearances and formalities all name them in the same render
 * (page loads audit, docs/ARCHITECTURE.md § 3 bis).
 */
export const listLegalPeople = trackedCache(async (organizationId: string) => {
  const supabase = await createClient();
  return supabase.rpc("list_legal_people", {
    p_organization_id: organizationId,
  });
});
