import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

/** The artist page shows « Business » (BIZ 10) to whoever reads the
 * artists' budgets, or sees at least one deal of this artist (RLS). */
export async function showsArtistBusiness(
  access: Access,
  artistId: string,
): Promise<boolean> {
  if (can(access, "read_artist_budgets")) return true;
  if (
    !can(access, "validate") &&
    !can(access, "negotiate") &&
    !can(access, "pilot_projects")
  )
    return false;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artistId);
  if (error) console.error("showsArtistBusiness:", error.message);
  return (count ?? 0) > 0;
}
