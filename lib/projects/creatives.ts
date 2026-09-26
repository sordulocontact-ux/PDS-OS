import "server-only";

import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type CreativeMember = { personId: string; name: string };

// Creative directors of a project (RLS: only people who see the project).
export async function listProjectCreatives(
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
}

// Every creative director of the organization, for the picker.
export async function listCreativePeople(
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
}
