import "server-only";

import { cache } from "react";

import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type CreativeMember = { personId: string; name: string };

// Creative directors of a project (RLS: only people who see the project),
// oldest first. Once per request: a project page's loaders (Cadrage,
// Conception, Master, Production, Activations…) all ask for them (page loads
// audit, docs/ARCHITECTURE.md § 3 bis).
export const listProjectCreatives = cache(async function listProjectCreatives(
  projectId: string,
): Promise<CreativeMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_creatives")
    .select(
      "person_id, person:people!project_creatives_person_id_fkey(first_name, last_name)",
    )
    .eq("project_id", projectId)
    .order("created_at");
  if (error) {
    console.error("listProjectCreatives:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    personId: row.person_id,
    name: row.person
      ? personName(row.person.first_name, row.person.last_name)
      : "",
  }));
});

// Every creative director of the organization, for the picker. Once per
// request (several loaders of a project page name them).
export const listCreativePeople = cache(async function listCreativePeople(
  organizationId: string,
): Promise<CreativeMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_creative_people", {
    p_organization_id: organizationId,
  });
  if (error) {
    console.error("listCreativePeople:", error.message);
    return [];
  }
  return (data ?? []).map((p) => ({
    personId: p.person_id,
    name: personName(p.first_name, p.last_name),
  }));
});
