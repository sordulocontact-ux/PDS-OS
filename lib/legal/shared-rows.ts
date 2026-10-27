import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// Rows of the Juridique that several loaders of one render read (the
// journey's context reads the État des lieux, the Cadrage, the Plan, the
// Suivi, the clearances and the bulletins together): one request per
// project and render instead of one per loader (page loads audit,
// docs/ARCHITECTURE.md § 3 bis). Each read is the union of the columns its
// callers ask for, with the same filter and order; callers filter in
// memory and never change what they get (it is shared). Under RLS like
// every read (manage_legal); a Server Action reads afresh (`cache` only
// memoizes while rendering).

/** The project's clearances, oldest first. */
export const legalClearanceRows = cache(async (projectId: string) => {
  const supabase = await createClient();
  return supabase
    .from("legal_clearances")
    .select(
      "id, master_id, element, work, author, status, usage, rights_scope, scope_reason, responsible_person_id, updated_at",
    )
    .eq("project_id", projectId)
    .order("created_at");
});

/** The project's legal plan (one per project), or null. */
export const legalPlanRow = cache(async (projectId: string) => {
  const supabase = await createClient();
  return supabase
    .from("legal_plans")
    .select("id, launched_at, launched_by, dismissed_keys")
    .eq("project_id", projectId)
    .maybeSingle();
});

/** The project's legal intake (one per project), or null. */
export const legalIntakeRow = cache(async (projectId: string) => {
  const supabase = await createClient();
  return supabase
    .from("legal_intakes")
    .select("status, confirmed_at, confirmed_by")
    .eq("project_id", projectId)
    .maybeSingle();
});
