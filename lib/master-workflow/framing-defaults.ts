import "server-only";

import { createClient } from "@/lib/supabase/server";

export type FramingDefaults = {
  mixContactId: string | null;
  masteringContactId: string | null;
  masterFinalDue: string | null;
};

/**
 * What the Cadrage intelligent confirmed for the Master (docs/ARCHITECTURE.md
 * § 6 and § 8 septies): who mixes and who masters (team roles held by a
 * contact of the Réseau) and the master final's date (an imposed deadline).
 * The Brief Mix/Master starts from it before its first save; credits on the
 * titles still come first.
 */
export async function loadFramingDefaults(
  projectId: string,
): Promise<FramingDefaults> {
  const supabase = await createClient();
  const [team, deadline] = await Promise.all([
    supabase
      .from("project_team_members")
      .select("role_key, contact_id")
      .eq("project_id", projectId)
      .eq("review_status", "confirmed")
      .in("role_key", ["mix_engineer", "mastering_engineer"])
      .not("contact_id", "is", null),
    supabase
      .from("framing_deadlines")
      .select("due_date")
      .eq("project_id", projectId)
      .eq("kind", "master_final")
      .eq("review_status", "confirmed")
      .order("due_date")
      .limit(1)
      .maybeSingle(),
  ]);
  const contactOf = (role: string) =>
    (team.data ?? []).find((m) => m.role_key === role)?.contact_id ?? null;
  return {
    mixContactId: contactOf("mix_engineer"),
    masteringContactId: contactOf("mastering_engineer"),
    masterFinalDue: deadline.data?.due_date ?? null,
  };
}
