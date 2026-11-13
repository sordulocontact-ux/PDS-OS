import "server-only";

import type { Access } from "@/lib/auth/access";
import { inWorkspaceDomain } from "@/lib/integrations/google-workspace";
import { createClient } from "@/lib/supabase/server";

/**
 * The member's work address (@pdsrecords.com), read with their session: the
 * one the direction wrote in Équipe, else their login address when it is in
 * the domain, else null. The only address the domain's delegation is ever
 * asked for (docs/ARCHITECTURE.md § 4 quater).
 */
export async function loadWorkAddress(
  access: Access,
): Promise<{ email: string | null; error: boolean }> {
  if (!access.personId || !access.organizationId)
    return { email: null, error: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("google_work_email")
    .eq("person_id", access.personId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (error) {
    console.error("loadWorkAddress:", error.message);
    return { email: null, error: true };
  }
  const written = data?.google_work_email ?? null;
  if (inWorkspaceDomain(written)) return { email: written, error: false };
  const login = access.email?.trim().toLowerCase() ?? null;
  return { email: inWorkspaceDomain(login) ? login : null, error: false };
}
