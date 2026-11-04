import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The person's page by project (lot 11), to send a workflow's object on
 * it: the active link read back (contact_link_token), or a new one
 * (issue_contact_link) when none works. Owner only, like both functions.
 * Null when it cannot be had: the caller keeps the object's own link.
 */
export async function ensureContactLink(
  projectId: string,
  contactId: string,
): Promise<{ id: string; token: string } | null> {
  const supabase = await createClient();
  const { data: active } = await supabase
    .from("project_contact_links")
    .select("id")
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (active) {
    const { data: token } = await supabase.rpc("contact_link_token", {
      p_link_id: active.id,
    });
    if (token) return { id: active.id, token };
  }
  const { data: token, error } = await supabase.rpc("issue_contact_link", {
    p_project_id: projectId,
    p_contact_id: contactId,
  });
  if (error || !token) {
    if (error) console.error("ensureContactLink:", error.code, error.message);
    return null;
  }
  const { data: issued } = await supabase
    .from("project_contact_links")
    .select("id")
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .is("revoked_at", null)
    .maybeSingle();
  return issued ? { id: issued.id, token } : null;
}
