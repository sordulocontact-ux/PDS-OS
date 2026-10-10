import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export type WelcomeVariant = "direction" | "pilot" | "creative" | "member";

// A member approved this recently sees the card until they close it.
const NEW_MEMBER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Which three points the member reads first: by permission, never by name. */
export function welcomeVariantOf(access: Access): WelcomeVariant {
  if (can(access, "assign_projects")) return "direction";
  if (can(access, "pilot_projects")) return "pilot";
  if (can(access, "creative_work")) return "creative";
  return "member";
}

/**
 * The « Bienvenue » card of the home (UX test of 09/10/2026), or null: shown
 * to a member approved less than 30 days ago who has not closed it.
 */
export async function loadWelcome(
  access: Access,
): Promise<WelcomeVariant | null> {
  if (!access.personId || !access.organizationId) return null;
  const supabase = await createClient();
  const [membership, dismissed] = await Promise.all([
    supabase
      .from("memberships")
      .select("decided_at, created_at")
      .eq("person_id", access.personId)
      .eq("organization_id", access.organizationId)
      .eq("status", "approved")
      .maybeSingle(),
    supabase
      .from("member_welcomes")
      .select("person_id")
      .eq("person_id", access.personId)
      .eq("organization_id", access.organizationId)
      .maybeSingle(),
  ]);
  if (membership.error || dismissed.error || dismissed.data) return null;
  const since = membership.data?.decided_at ?? membership.data?.created_at;
  if (!since || Date.now() - Date.parse(since) > NEW_MEMBER_DAYS * DAY_MS)
    return null;
  return welcomeVariantOf(access);
}
